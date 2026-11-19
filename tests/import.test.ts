import test from "node:test";
import assert from "node:assert/strict";
import { eventImportSchema } from "../src/lib/import-schema";

const event = {
  id: "organizer-event-001", title: "Test entry", organizer: "Test organizer", circuitId: "tsukuba",
  startsAt: "2027-01-15T09:00:00+09:00", priceYen: 18000, discipline: "GRIP", beginner: true,
  sourceUrl: "https://example.test/event", verifiedAt: "2026-01-01T00:00:00Z"
};
test("event import requires explicit verification and timezone-aware timestamps", () => {
  assert.equal(eventImportSchema.safeParse([event]).success, true);
  assert.equal(eventImportSchema.safeParse([{ ...event, verifiedAt: undefined }]).success, false);
  assert.equal(eventImportSchema.safeParse([{ ...event, startsAt: "2027-01-15T09:00:00" }]).success, false);
});
test("event import rejects unsafe sources, negative prices, duplicate IDs and extra keys", () => {
  for (const patch of [{ sourceUrl: "javascript:alert(1)" }, { sourceUrl: "http://example.test/event" },
    { priceYen: -100 }, { status: "VERIFIED" }, { verifiedAt: "2099-01-01T00:00:00Z" }]) {
    assert.equal(eventImportSchema.safeParse([{ ...event, ...patch }]).success, false);
  }
  assert.equal(eventImportSchema.safeParse([event, event]).success, false);
});
