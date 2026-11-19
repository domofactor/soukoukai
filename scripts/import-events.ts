import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { eventImportSchema } from "../src/lib/import-schema";

const db = new PrismaClient();
async function main() {
  const path = process.argv[2];
  if (!path || process.argv[3] !== "--confirm-verified") {
    throw new Error("Usage: npm run events:import -- path/to/events.json --confirm-verified. Manually verify every listing with its organizer before publishing.");
  }
  const events = eventImportSchema.parse(JSON.parse(await readFile(path, "utf8")));
  const circuits = await db.circuit.findMany({ select: { id: true } });
  const unknown = events.find((event) => !circuits.some((circuit) => circuit.id === event.circuitId));
  if (unknown) throw new Error(`Unknown circuit ID: ${unknown.circuitId}. Add the circuit before importing events.`);
  await db.$transaction(async (tx) => {
    for (const event of events) {
      const previous = await tx.event.findUnique({ where: { id: event.id } });
      if (previous?.ownerId) throw new Error(`Event ID ${event.id} belongs to an organizer and cannot be overwritten by an import.`);
      const data = { ...event, startsAt: new Date(event.startsAt), verifiedAt: new Date(event.verifiedAt),
        status: "VERIFIED" as const, publishedAt: previous?.publishedAt ?? previous?.createdAt ?? new Date(),
        descriptionOriginal: event.descriptionOriginal ?? null, descriptionLanguage: event.descriptionLanguage ?? null,
        descriptionTranslation: event.descriptionTranslation ?? null,
        translationStatus: event.descriptionTranslation ? "EDITED" as const : "NONE" as const,
        translationEdited: Boolean(event.descriptionTranslation) };
      await tx.event.upsert({ where: { id: event.id }, create: data, update: data });
    }
  });
  console.log(`Published ${events.length} verified event listings.`);
}
main().catch((error: unknown) => {
  console.error("Event import failed:", error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
