import type { Prisma } from "@prisma/client";
import type { TrackEvent } from "./types";
import type { Locale } from "./locale";

export function publicEventsWhere(now = new Date()): Prisma.EventWhereInput {
  return { startsAt: { gte: now }, OR: [
    { status: "VERIFIED", ownerId: null, verifiedAt: { not: null } },
    { status: "ORGANIZER", ownerId: { not: null } }
  ] };
}
export function eventDescription(event: TrackEvent, locale: Locale) {
  const current = event.translationStatus === "AUTO" || event.translationStatus === "EDITED";
  if (event.descriptionLanguage !== locale && current && event.descriptionTranslation) {
    return { text: event.descriptionTranslation, translated: true, automatic: event.translationStatus === "AUTO", language: locale };
  }
  return { text: event.descriptionOriginal, translated: false, automatic: false, language: event.descriptionLanguage ?? locale };
}
