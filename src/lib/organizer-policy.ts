import { z } from "zod";
import { disciplines } from "./event-types";
import { hasMembership, type BillingAccess, type AccountType } from "./entitlements";

export const organizerEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  organizer: z.string().trim().min(1).max(200),
  circuitId: z.string().min(1).max(80),
  startsAt: z.string().datetime({ offset: true }),
  priceYen: z.number().int().min(0).max(10000000).nullable(),
  discipline: z.enum(disciplines),
  beginner: z.boolean(),
  sourceUrl: z.string().url().refine((value) => new URL(value).protocol === "https:"),
  descriptionOriginal: z.string().trim().max(5000),
  descriptionLanguage: z.enum(["en", "ja"]),
  descriptionTranslation: z.string().trim().max(10000)
}).strict();

export type OrganizerActor = { id: string; accountType: AccountType | null; onboarded: boolean; billing: BillingAccess | null };
export function canManage(actor: OrganizerActor, event: { ownerId: string | null; status: string }) {
  return actor.onboarded && actor.accountType === "ORGANIZER" && event.ownerId === actor.id &&
    ["DRAFT", "ORGANIZER"].includes(event.status);
}
export function canPublish(actor: OrganizerActor, now = new Date()) {
  return actor.onboarded && actor.accountType === "ORGANIZER" && hasMembership(actor.billing, "ORGANIZER", now);
}
export function descriptionUpdate(input: {
  descriptionOriginal: string; descriptionLanguage: "en" | "ja"; descriptionTranslation: string;
}, previous?: {
  descriptionOriginal: string | null; descriptionLanguage: string | null;
  descriptionTranslation: string | null; translationStatus: "NONE" | "AUTO" | "EDITED" | "STALE" | "FAILED";
  translationEdited: boolean;
}) {
  if (!input.descriptionOriginal) return {
    descriptionOriginal: null, descriptionLanguage: null, descriptionTranslation: null,
    translationStatus: "NONE" as const, translationEdited: false, generate: false
  };
  const sourceChanged = input.descriptionOriginal !== previous?.descriptionOriginal ||
    input.descriptionLanguage !== previous?.descriptionLanguage;
  const manuallyChanged = input.descriptionTranslation !== (previous?.descriptionTranslation ?? "");
  const edited = manuallyChanged ? Boolean(input.descriptionTranslation) : previous?.translationEdited ?? false;
  const translationStatus = manuallyChanged && input.descriptionTranslation ? "EDITED" as const :
    sourceChanged && input.descriptionTranslation ? "STALE" as const : previous?.translationStatus ?? "NONE" as const;
  return {
    descriptionOriginal: input.descriptionOriginal, descriptionLanguage: input.descriptionLanguage,
    descriptionTranslation: input.descriptionTranslation || null, translationStatus,
    translationEdited: edited,
    generate: !edited && (sourceChanged || manuallyChanged || !input.descriptionTranslation)
  };
}
