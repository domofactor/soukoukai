import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLocale, translator, localizedPath, regionLabel } from "../src/lib/locale";
import { acceptedPriceIds, priceForPlan } from "../src/lib/billing";
import japan from "../src/data/japan.json";

test("locale links preserve filters, fragments and Japanese queries", () => {
  const result = new URL(localizedPath("/?q=筑波&discipline=PVC_DRIFT#explore", "ja"), "https://example.test");
  assert.equal(result.searchParams.get("q"), "筑波");
  assert.equal(result.searchParams.get("discipline"), "PVC_DRIFT");
  assert.equal(result.searchParams.get("lang"), "ja");
  assert.equal(result.hash, "#explore");
  assert.equal(translator("ja")("English", "日本語"), "日本語");
  assert.equal(normalizeLocale("bad"), "en");
  assert.equal(regionLabel("Kanto", "ja"), "関東");
});
test("only Japan geometry is bundled, including Okinawa, Yaeyama and Ogasawara", () => {
  assert.equal(japan.type, "Feature");
  assert.equal(japan.properties.name, "Japan");
  assert.equal(japan.geometry.type, "MultiPolygon");
  const contains = (lng: number, lat: number) => japan.geometry.coordinates.some((polygon) => {
    const ring = polygon[0];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i]; const [prevX, prevY] = ring[j];
      if ((y > lat) !== (prevY > lat) && lng < (prevX - x) * (lat - y) / (prevY - y) + x) inside = !inside;
    }
    return inside;
  });
  // Inland reference points: Tokyo, Shuri Castle, Ishigaki, Chichijima and Sapporo.
  for (const [lng, lat] of [[139.76, 35.68], [127.7195, 26.217], [124.17, 24.4], [142.2164, 27.0914], [141.35, 43.06]]) assert.equal(contains(lng, lat), true, `${lng},${lat} should be Japan`);
  for (const [lng, lat] of [[126.98, 37.56], [121.56, 25.03], [135.07, 48.48]]) assert.equal(contains(lng, lat), false);
});
test("separate configured prices preserve legacy attendee subscriptions and reject plan collisions", () => {
  const keys = ["STRIPE_PRICE_ID", "STRIPE_ATTENDEE_PRICE_ID", "STRIPE_ORGANIZER_PRICE_ID"] as const;
  const previous = keys.map((key) => process.env[key]);
  try {
    process.env.STRIPE_PRICE_ID = "price_legacy";
    delete process.env.STRIPE_ATTENDEE_PRICE_ID;
    process.env.STRIPE_ORGANIZER_PRICE_ID = "price_organizer";
    assert.equal(priceForPlan("ATTENDEE"), "price_legacy");
    assert.equal(priceForPlan("ORGANIZER"), "price_organizer");
    process.env.STRIPE_ATTENDEE_PRICE_ID = "price_attendee";
    assert.equal(priceForPlan("ATTENDEE"), "price_attendee");
    assert.deepEqual(acceptedPriceIds("ATTENDEE"), ["price_attendee", "price_legacy"]);
    assert.deepEqual(acceptedPriceIds("ORGANIZER"), ["price_organizer"]);
    for (const collision of ["price_legacy", "price_attendee"]) {
      process.env.STRIPE_ORGANIZER_PRICE_ID = collision;
      assert.throws(() => priceForPlan("ORGANIZER"), /distinct/);
    }
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    });
  }
});
