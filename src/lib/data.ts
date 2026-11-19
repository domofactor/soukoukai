import { db } from "./db";
import { demoCircuits, demoEvents } from "./demo";
import type { TrackEvent } from "./types";

export function isDemo() {
  return process.env.DEMO_MODE === "true" ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production");
}

export async function discoveryData() {
  if (isDemo()) return { circuits: demoCircuits, events: demoEvents(), demo: true };
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required outside demo mode.");
  const [circuits, rows] = await Promise.all([
    db.circuit.findMany({ orderBy: { name: "asc" } }),
    db.event.findMany({
      where: { status: "VERIFIED", startsAt: { gte: new Date() }, verifiedAt: { not: null } },
      orderBy: { startsAt: "asc" }
    })
  ]);
  const events: TrackEvent[] = rows.map((row) => ({
    ...row, startsAt: row.startsAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null
  }));
  return { circuits, events, demo: false };
}
