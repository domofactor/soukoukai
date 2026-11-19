import { z } from "zod";

export const eventImportSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  title: z.string().trim().min(1).max(200),
  organizer: z.string().trim().min(1).max(200),
  circuitId: z.string().min(1).max(80),
  startsAt: z.string().datetime({ offset: true }),
  priceYen: z.number().int().min(0).max(10000000).nullable(),
  discipline: z.enum(["GRIP", "DRIFT", "MIXED"]),
  beginner: z.boolean(),
  sourceUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Use the official HTTPS source URL"),
  verifiedAt: z.string().datetime({ offset: true }).refine(
    (value) => Date.parse(value) <= Date.now(), "Verification cannot be in the future"
  )
}).strict()).min(1).max(1000).refine(
  (events) => new Set(events.map((event) => event.id)).size === events.length,
  "Event IDs must be unique within an import"
);
