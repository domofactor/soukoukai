import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { disciplines } from "../src/lib/event-types";

test("PostgreSQL migrations preserve existing subscribers without guessing Driver/Spectator identity", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(await readFile("prisma/migrations/20261119000000_initial/migration.sql", "utf8"));
    await pg.exec(`
      INSERT INTO "User" ("id", "email") VALUES ('existing', 'existing@example.test');
      INSERT INTO "Billing" ("userId", "stripeCustomerId", "stripeSubscriptionId", "status", "currentPeriodEnd", "updatedAt")
        VALUES ('existing', 'cus_existing', 'sub_existing', 'active', '2027-01-01', now());
      INSERT INTO "SavedSearch" ("id", "userId", "name", "filters", "alerts")
        VALUES ('search', 'existing', 'Old search', '{"discipline":"DRIFT"}', true);
      INSERT INTO "Circuit" ("id", "name", "nameJa", "prefecture", "region", "latitude", "longitude", "website")
        VALUES ('test', 'Test', 'テスト', 'Tokyo', 'Kanto', 35, 139, 'https://example.test');
      INSERT INTO "Event" ("id", "title", "organizer", "circuitId", "startsAt", "discipline", "sourceUrl", "status", "verifiedAt")
        VALUES ('verified', 'Operator listing', 'Operator', 'test', '2027-01-01', 'GRIP', 'https://example.test', 'VERIFIED', now());
    `);
    // Exercise the same transactional DDL boundary used by migration deployment.
    await pg.exec(`BEGIN;\n${await readFile("prisma/migrations/20261119160000_organizers_and_japanese/migration.sql", "utf8")}\nCOMMIT;`);
    const user = (await pg.query<{ accountType: string | null; onboarded: boolean }>('SELECT "accountType", "onboarded" FROM "User"')).rows[0];
    assert.equal(user.accountType, null);
    assert.equal(user.onboarded, false);
    const billing = (await pg.query<{ plan: string; status: string; stripeSubscriptionId: string }>('SELECT "plan", "status", "stripeSubscriptionId" FROM "Billing"')).rows[0];
    assert.deepEqual(billing, { plan: "ATTENDEE", status: "active", stripeSubscriptionId: "sub_existing" });
    const search = (await pg.query<{ locale: string; alerts: boolean }>('SELECT "locale", "alerts" FROM "SavedSearch"')).rows[0];
    assert.deepEqual(search, { locale: "en", alerts: true });
    const types = (await pg.query<{ enumlabel: string }>(`SELECT enumlabel FROM pg_enum JOIN pg_type ON enumtypid=pg_type.oid WHERE typname='Discipline' ORDER BY enumsortorder`)).rows.map((row) => row.enumlabel);
    assert.deepEqual(types, [...disciplines]);
    const published = (await pg.query<{ preserved: boolean }>(`SELECT "publishedAt" = "createdAt" AS preserved FROM "Event" WHERE id='verified'`)).rows[0];
    assert.equal(published.preserved, true);
    for (const role of ["DRIVER", "SPECTATOR"]) {
      await pg.query('UPDATE "User" SET "accountType"=$1, "onboarded"=true WHERE id=$2', [role, "existing"]);
      assert.equal((await pg.query<{ plan: string }>('SELECT plan FROM "Billing"')).rows[0].plan, "ATTENDEE");
    }
    await pg.exec(`INSERT INTO "User" (id, "accountType", onboarded) VALUES ('owner', 'ORGANIZER', true);
      INSERT INTO "Event" ("id", "title", "organizer", "circuitId", "startsAt", "discipline", "sourceUrl", "status", "ownerId")
      VALUES ('own', 'Organizer listing', 'Owner', 'test', '2027-01-01', 'PVC_DRIFT', 'https://example.test', 'DRAFT', 'owner');`);
    await pg.exec(`UPDATE "Event" SET status='ORGANIZER', "publishedAt"=now() WHERE id='own'`);
    assert.equal((await pg.query<{ count: number }>(`SELECT count(*)::int AS count FROM "Event" WHERE status::text IN ('VERIFIED','ORGANIZER')`)).rows[0].count, 2);
    await assert.rejects(pg.exec(`UPDATE "Event" SET status='VERIFIED', "verifiedAt"=now() WHERE id='own'`), /Event_provenance_check/);
    await assert.rejects(pg.exec(`UPDATE "Event" SET "descriptionLanguage"='fr' WHERE id='own'`), /Event_descriptionLanguage_check/);
    await pg.exec(`UPDATE "Event" SET status='DRAFT' WHERE id='own'`);
    assert.equal((await pg.query<{ count: number }>(`SELECT count(*)::int AS count FROM "Event" WHERE status::text IN ('VERIFIED','ORGANIZER')`)).rows[0].count, 1);
    await pg.exec(`DELETE FROM "Event" WHERE id='own'`);
    assert.equal((await pg.query<{ count: number }>(`SELECT count(*)::int AS count FROM "Event" WHERE id='own'`)).rows[0].count, 0);
  } finally { await pg.close(); }
});
