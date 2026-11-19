import { z } from "zod";
import { disciplines } from "./event-types";

export const eventImportSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  title: z.string().trim().min(1).max(200),
  organizer: z.string().trim().min(1).max(200),
  circuitId: z.string().min(1).max(80),
  startsAt: z.string().datetime({ offset: true }),
  priceYen: z.number().int().min(0).max(10000000).nullable(),
  discipline: z.enum(disciplines),
  beginner: z.boolean(),
  descriptionOriginal: z.string().trim().min(1).max(5000).optional(),
  descriptionLanguage: z.enum(["en", "ja"]).optional(),
  descriptionTranslation: z.string().trim().min(1).max(10000).optional(),
  sourceUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Use the official HTTPS source URL"),
  verifiedAt: z.string().datetime({ offset: true }).refine(
    (value) => Date.parse(value) <= Date.now(), "Verification cannot be in the future"
  )
}).strict().refine((event) => Boolean(event.descriptionOriginal) === Boolean(event.descriptionLanguage) &&
  (!event.descriptionTranslation || Boolean(event.descriptionOriginal)), "Descriptions require an original and its language")).min(1).max(1000).refine(
  (events) => new Set(events.map((event) => event.id)).size === events.length,
  "Event IDs must be unique within an import"
);
