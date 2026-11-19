"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManage, canPublish, descriptionUpdate, organizerEventSchema } from "@/lib/organizer-policy";
import { translateDescription } from "@/lib/translation";

class EventError extends Error {}
const idSchema = z.string().min(1).max(100);
const revisionSchema = z.coerce.number().int().min(0);

async function actor() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (!user.onboarded) redirect("/onboarding");
  if (user.accountType !== "ORGANIZER") redirect("/account?notice=role");
  return user;
}
function refresh() { revalidatePath("/organizer"); revalidatePath("/"); }
function target(notice: string, id?: string): never {
  redirect(`/organizer?notice=${notice}${id ? `&edit=${encodeURIComponent(id)}` : ""}`);
}

async function generate(id: string, userId: string, revision: number) {
  const row = await db.event.findFirst({ where: { id, ownerId: userId, revision } });
  if (!row?.descriptionOriginal || !row.descriptionLanguage) throw new EventError("conflict");
  try {
    const translated = await translateDescription(row.descriptionOriginal, row.descriptionLanguage === "ja" ? "ja" : "en");
    const result = await db.event.updateMany({
      where: { id, ownerId: userId, revision },
      data: { descriptionTranslation: translated, translationStatus: "AUTO", translationEdited: false, revision: { increment: 1 } }
    });
    if (!result.count) throw new EventError("conflict");
    return "saved";
  } catch (error) {
    if (error instanceof EventError) throw error;
    console.error("Event description translation failed", { eventId: id, error });
    const result = await db.event.updateMany({
      where: { id, ownerId: userId, revision },
      data: { translationStatus: row.descriptionTranslation ? "STALE" : "FAILED", revision: { increment: 1 } }
    });
    if (!result.count) throw new EventError("conflict");
    return "translation";
  }
}

export async function saveEvent(form: FormData) {
  const user = await actor();
  const id = form.get("id") ? idSchema.safeParse(form.get("id")) : null;
  const revision = revisionSchema.safeParse(form.get("revision"));
  const parsed = organizerEventSchema.safeParse({
    title: form.get("title"), organizer: form.get("organizer"), circuitId: form.get("circuitId"),
    startsAt: `${form.get("startsAt")}:00+09:00`, priceYen: form.get("priceYen") === "" ? null : Number(form.get("priceYen")),
    discipline: form.get("discipline"), beginner: form.get("beginner") === "on", sourceUrl: form.get("sourceUrl"),
    descriptionOriginal: form.get("descriptionOriginal"), descriptionLanguage: form.get("descriptionLanguage"),
    descriptionTranslation: form.get("descriptionTranslation")
  });
  if ((id && !id.success) || !revision.success || !parsed.success) target("invalid", id?.success ? id.data : undefined);
  let saved: { id: string; revision: number; generate: boolean };
  try {
    saved = await db.$transaction(async (tx) => {
      const owner = await tx.user.findUniqueOrThrow({ where: { id: user.id }, include: { billing: true } });
      if (!canPublish(owner)) throw new EventError("subscription");
      const previous = id?.success ? await tx.event.findUnique({ where: { id: id.data } }) : null;
      if (id?.success && (!previous || !canManage(owner, previous))) throw new EventError("ownership");
      if (previous && previous.revision !== revision.data) throw new EventError("conflict");
      if (!await tx.circuit.findUnique({ where: { id: parsed.data.circuitId } })) throw new EventError("invalid");
      const { generate, ...description } = descriptionUpdate(parsed.data, previous ?? undefined);
      const data = { ...parsed.data, ...description, startsAt: new Date(parsed.data.startsAt) };
      const row = previous ? await tx.event.update({
        where: { id: previous.id }, data: { ...data, revision: { increment: 1 } }
      }) : await tx.event.create({ data: { ...data, ownerId: user.id, status: "DRAFT" } });
      return { id: row.id, revision: row.revision, generate };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof EventError) target(error.message, id?.success ? id.data : undefined);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") target("conflict");
    console.error("Organizer event save failed", error);
    target("failed");
  }
  let notice = "saved";
  if (saved.generate) {
    try { notice = await generate(saved.id, user.id, saved.revision); }
    catch (error) {
      if (!(error instanceof EventError)) throw error;
      notice = error.message;
    }
  }
  refresh();
  target(notice, saved.id);
}

export async function eventLifecycle(form: FormData) {
  const user = await actor();
  const parsed = z.object({
    id: idSchema, revision: revisionSchema, intent: z.enum(["publish", "withdraw", "delete", "translate"]),
    replace: z.boolean()
  }).safeParse({ id: form.get("id"), revision: form.get("revision"), intent: form.get("intent"), replace: form.get("replace") === "on" });
  if (!parsed.success) target("invalid");
  const { id, revision, intent, replace } = parsed.data;
  let notice = intent === "publish" ? "published" : intent === "delete" ? "deleted" : "withdrawn";
  try {
    await db.$transaction(async (tx) => {
      const owner = await tx.user.findUniqueOrThrow({ where: { id: user.id }, include: { billing: true } });
      const row = await tx.event.findUnique({ where: { id } });
      if (!row || !canManage(owner, row)) throw new EventError("ownership");
      if (row.revision !== revision) throw new EventError("conflict");
      if (["publish", "translate"].includes(intent) && !canPublish(owner)) throw new EventError("subscription");
      if (intent === "translate") {
        if (!row.descriptionOriginal || (row.translationEdited && !replace)) throw new EventError("replace");
        return;
      }
      if (intent === "delete") { await tx.event.delete({ where: { id } }); return; }
      if (intent === "publish" && row.startsAt <= new Date()) throw new EventError("past");
      await tx.event.update({ where: { id }, data: {
        status: intent === "publish" ? "ORGANIZER" : "DRAFT",
        publishedAt: intent === "publish" ? row.publishedAt ?? new Date() : row.publishedAt,
        revision: { increment: 1 }
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (intent === "translate") {
      notice = await generate(id, user.id, revision);
    }
  } catch (error) {
    if (error instanceof EventError) target(error.message, id);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") target("conflict", id);
    console.error("Organizer lifecycle change failed", error);
    target("failed", id);
  }
  refresh();
  target(notice, intent === "translate" ? id : undefined);
}
