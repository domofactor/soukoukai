import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/data";
import { hasPro } from "@/lib/entitlements";
import { filterEvents, filterSchema, japanDate } from "@/lib/search";
import { appUrl } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || isDemo() || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return Response.json({ error: "Alerts are not configured." }, { status: 503 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  try {
    const [searches, circuits] = await Promise.all([
      db.savedSearch.findMany({ where: { alerts: true }, include: { user: { include: { billing: true } } } }),
      db.circuit.findMany()
    ]);
    for (const search of searches) {
      if (!hasPro(search.user.billing) || !search.user.email) continue;
      const filters = filterSchema.parse(search.filters);
      const rows = await db.event.findMany({
        where: { status: "VERIFIED", verifiedAt: { not: null }, startsAt: { gte: new Date() },
          createdAt: { gt: search.createdAt }, deliveries: { none: { searchId: search.id, sentAt: { not: null } } } },
        orderBy: { startsAt: "asc" }
      });
      const events = rows.map((row) => ({
        ...row, startsAt: row.startsAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null
      }));
      for (const event of filterEvents(events, circuits, filters)) {
        const delivery = await db.alertDelivery.upsert({
          where: { searchId_eventId: { searchId: search.id, eventId: event.id } },
          update: {}, create: { searchId: search.id, eventId: event.id }
        });
        if (delivery.sentAt) continue;
        // Resend's idempotency keys expire after 24h. Ambiguous older sends need operator reconciliation.
        if (Date.now() - delivery.createdAt.getTime() >= 23 * 60 * 60 * 1000) {
          throw new Error(`Alert delivery ${delivery.id} requires manual reconciliation before retry.`);
        }
        const circuit = circuits.find((entry) => entry.id === event.circuitId)!;
        const { error } = await resend.emails.send({
          from: process.env.EMAIL_FROM, to: search.user.email,
          subject: `New track-day listing: ${event.title}`,
          text: [
            `A new listing matches "${search.name}".`, "", event.title,
            `${circuit.name} · ${circuit.prefecture}`, `${japanDate(event.startsAt)} (Japan time)`,
            `Organizer: ${event.organizer}`,
            event.priceYen === null ? "Entry fee: check with organizer" : `Listed entry fee: JPY ${event.priceYen}`,
            "", "Open the event explorer to review details before booking:", appUrl(`/?circuit=${circuit.id}#explore`),
            "", "Manage or stop these alerts by deleting the saved search in your garage:", appUrl("/account"),
            "", "Soukoukai does not sell event tickets. Always confirm the schedule and requirements with the organizer."
          ].join("\n")
        }, { idempotencyKey: `alert-${delivery.id}` });
        if (error) throw new Error(`Email provider rejected alert ${delivery.id}: ${error.message}`);
        await db.alertDelivery.update({ where: { id: delivery.id }, data: { sentAt: new Date() } });
        sent++;
        if (sent >= 50) return Response.json({ sent, moreWorkMayRemain: true }, { headers: { "Cache-Control": "no-store" } });
      }
    }
    return Response.json({ sent, moreWorkMayRemain: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Scheduled event alerts failed", error);
    return Response.json({ error: "Alert delivery failed; inspect server logs before retrying.", sent }, { status: 500 });
  }
}
