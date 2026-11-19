import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/data";
import { hasPro } from "@/lib/entitlements";
import { filterEvents, filterSchema } from "@/lib/search";
import { appUrl } from "@/lib/billing";
import { publicEventsWhere } from "@/lib/event-visibility";
import { alertMessage } from "@/lib/alert-message";
import { normalizeLocale } from "@/lib/locale";

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
      if (search.user.accountType === "ORGANIZER" || !hasPro(search.user.billing) || !search.user.email) continue;
      const filters = filterSchema.parse(search.filters);
      const rows = await db.event.findMany({
        where: { ...publicEventsWhere(),
          publishedAt: { gt: search.createdAt }, deliveries: { none: { searchId: search.id, sentAt: { not: null } } } },
        orderBy: { startsAt: "asc" }
      });
      const events = rows.map((row) => ({
        ...row, startsAt: row.startsAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null
      }));
      for (const event of filterEvents(events, circuits, filters)) {
        // Persist the idempotency key before the external send, even if the send transaction rolls back.
        const reserved = await db.alertDelivery.upsert({
          where: { searchId_eventId: { searchId: search.id, eventId: event.id } },
          update: {}, create: { searchId: search.id, eventId: event.id }
        });
        const delivered = await db.$transaction(async (tx) => {
          // Serialize delivery with edits/withdrawal and other senders. Recheck live visibility and filters.
          await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${event.id} FOR UPDATE`;
          const live = await tx.event.findFirst({ where: { id: event.id, ...publicEventsWhere() } });
          if (!live) return false;
          const current = { ...live, startsAt: live.startsAt.toISOString(), verifiedAt: live.verifiedAt?.toISOString() ?? null };
          if (!filterEvents([current], circuits, filters).length) return false;
          const subscriber = await tx.user.findUnique({ where: { id: search.userId }, include: { billing: true } });
          if (!subscriber?.email || subscriber.accountType === "ORGANIZER" || !hasPro(subscriber.billing)) return false;
          await tx.$queryRaw`SELECT "id" FROM "SavedSearch" WHERE "id" = ${search.id} FOR UPDATE`;
          const liveSearch = await tx.savedSearch.findUnique({ where: { id: search.id } });
          if (!liveSearch?.alerts) return false;
          const delivery = await tx.alertDelivery.findUnique({ where: { id: reserved.id } });
          if (!delivery || delivery.sentAt) return false;
          // Resend's idempotency keys expire after 24h. Ambiguous older sends need operator reconciliation.
          if (Date.now() - delivery.createdAt.getTime() >= 23 * 60 * 60 * 1000) {
            throw new Error(`Alert delivery ${delivery.id} requires manual reconciliation before retry.`);
          }
          const circuit = circuits.find((entry) => entry.id === current.circuitId)!;
          const { error } = await resend.emails.send({
            from: process.env.EMAIL_FROM!, to: subscriber.email,
            ...alertMessage(current, circuit, search.name, normalizeLocale(search.locale), appUrl)
          }, { idempotencyKey: `alert-${delivery.id}` });
          if (error) throw new Error(`Email provider rejected alert ${delivery.id}: ${error.message}`);
          await tx.alertDelivery.update({ where: { id: delivery.id }, data: { sentAt: new Date() } });
          return true;
        }, { timeout: 20000 });
        if (delivered) sent++;
        if (sent >= 50) return Response.json({ sent, moreWorkMayRemain: true }, { headers: { "Cache-Control": "no-store" } });
      }
    }
    return Response.json({ sent, moreWorkMayRemain: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Scheduled event alerts failed", error);
    return Response.json({ error: "Alert delivery failed; inspect server logs before retrying.", sent }, { status: 500 });
  }
}
