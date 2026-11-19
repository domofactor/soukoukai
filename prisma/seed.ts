import { PrismaClient } from "@prisma/client";
import { demoCircuits } from "../src/lib/demo";

const db = new PrismaClient();
async function seed() {
  for (const circuit of demoCircuits) {
    await db.circuit.upsert({ where: { id: circuit.id }, create: circuit, update: circuit });
  }
  console.log("Seeded circuit directory only. No fictional events were published.");
}
seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
