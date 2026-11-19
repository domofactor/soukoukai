import test from "node:test";
import assert from "node:assert/strict";
import { hasPro } from "../src/lib/entitlements";

const now = new Date("2026-11-19T00:00:00Z");
const end = new Date("2026-12-19T00:00:00Z");
test("only active or trialing subscriptions with future access periods unlock Pro", () => {
  for (const status of ["active", "trialing"]) assert.equal(hasPro({ status, currentPeriodEnd: end }, now), true);
  for (const status of ["inactive", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]) {
    assert.equal(hasPro({ status, currentPeriodEnd: end }, now), false);
  }
});
test("missing and expired billing records never unlock Pro, including exact period end", () => {
  assert.equal(hasPro(null, now), false);
  assert.equal(hasPro({ status: "active", currentPeriodEnd: null }, now), false);
  assert.equal(hasPro({ status: "active", currentPeriodEnd: now }, now), false);
  assert.equal(hasPro({ status: "trialing", currentPeriodEnd: new Date("2026-11-18") }, now), false);
});
