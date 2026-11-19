import test from "node:test";
import assert from "node:assert/strict";
import { hasPro, hasMembership, membershipForAccount } from "../src/lib/entitlements";

const now = new Date("2026-11-19T00:00:00Z");
const end = new Date("2026-12-19T00:00:00Z");
test("only active or trialing subscriptions with future access periods unlock Pro", () => {
  for (const status of ["active", "trialing"]) assert.equal(hasPro({ plan: "ATTENDEE", status, currentPeriodEnd: end }, now), true);
  for (const status of ["inactive", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]) {
    assert.equal(hasPro({ plan: "ATTENDEE", status, currentPeriodEnd: end }, now), false);
  }
});
test("missing and expired billing records never unlock Pro, including exact period end", () => {
  assert.equal(hasPro(null, now), false);
  assert.equal(hasPro({ plan: "ATTENDEE", status: "active", currentPeriodEnd: null }, now), false);
  assert.equal(hasPro({ plan: "ATTENDEE", status: "active", currentPeriodEnd: now }, now), false);
  assert.equal(hasPro({ plan: "ATTENDEE", status: "trialing", currentPeriodEnd: new Date("2026-11-18") }, now), false);
});
test("Driver and Spectator share attendee pricing without granting organizer publishing", () => {
  for (const role of ["DRIVER", "SPECTATOR", null] as const) assert.equal(membershipForAccount(role), "ATTENDEE");
  assert.equal(membershipForAccount("ORGANIZER"), "ORGANIZER");
  const attendee = { plan: "ATTENDEE" as const, status: "active", currentPeriodEnd: end };
  assert.equal(hasMembership(attendee, "ORGANIZER", now), false);
  assert.equal(hasPro({ ...attendee, plan: "ORGANIZER" }, now), false);
});
