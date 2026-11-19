import test from "node:test";
import assert from "node:assert/strict";
import { formatYen } from "../src/lib/format";

test("JPY labels use a stable explicit yen symbol across browser/server locale data", () => {
  assert.equal(formatYen(18000), "\u00a518,000");
  assert.equal(formatYen(0), "\u00a50");
});
