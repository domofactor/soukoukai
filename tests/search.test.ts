import test from "node:test";
import assert from "node:assert/strict";
import { demoCircuits, demoEvents } from "../src/lib/demo";
import { distanceKm, emptyFilters, filterEvents, filtersFromParams, filterSchema, japanDate, searchUrl } from "../src/lib/search";
import type { TrackEvent } from "../src/lib/types";

const events = demoEvents(new Date("2026-11-19T12:00:00Z"));
const search = (patch: Partial<typeof emptyFilters>) => filterEvents(events, demoCircuits, { ...emptyFilters, ...patch });

test("demo data is explicitly fictional and never auto-published as verified", () => {
  assert.equal(events.length, 16);
  assert.ok(events.every((event) => event.status === "DEMO" && event.verifiedAt === null));
  assert.ok(events.every((event) => demoCircuits.some((circuit) => circuit.id === event.circuitId)));
});
test("searches English and Japanese circuit names, prefectures and organizers", () => {
  assert.equal(search({ query: "筑波" }).length, 2);
  assert.equal(search({ query: "IBARAKI" }).length, 2);
  assert.equal(search({ query: "Sample organizer" }).length, 16);
});
test("combines circuit, region, discipline, budget and beginner filters", () => {
  const result = search({ circuit: "tsukuba", region: "Kanto", discipline: "GRIP", maxPrice: 18000, beginner: true });
  assert.ok(result.length > 0);
  assert.ok(result.every((event) => event.circuitId === "tsukuba" && event.priceYen! <= 18000 && event.beginner));
  assert.equal(search({ circuit: "tsukuba", region: "Kyushu" }).length, 0);
});
test("uses inclusive Japan dates, not the browser timezone or UTC day", () => {
  const fixture: TrackEvent = { ...events[0], startsAt: "2026-12-01T15:00:00Z" };
  assert.equal(japanDate(fixture.startsAt), "2026-12-02");
  assert.equal(filterEvents([fixture], demoCircuits, { ...emptyFilters, from: "2026-12-02", to: "2026-12-02" }).length, 1);
  assert.equal(filterEvents([fixture], demoCircuits, { ...emptyFilters, to: "2026-12-01" }).length, 0);
});
test("budget excludes unknown prices and includes free entries", () => {
  const fixture = [{ ...events[0], priceYen: null }, { ...events[1], priceYen: 0 }];
  assert.equal(filterEvents(fixture, demoCircuits, { ...emptyFilters, maxPrice: 0 }).length, 1);
});
test("location search applies the radius in kilometres", () => {
  const tsukuba = demoCircuits[0];
  const result = search({ near: { latitude: tsukuba.latitude, longitude: tsukuba.longitude, radiusKm: 1 } });
  assert.equal(result.length, 2);
  assert.ok(result.every((event) => event.circuitId === "tsukuba"));
  assert.equal(distanceKm(35, 139, 35, 139), 0);
  assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.195) < 0.01);
});
test("validates malformed dates, inverted ranges, nonfinite budgets, coordinates and unknown keys", () => {
  for (const invalid of [{ from: "2026-02-30" }, { from: "2026-12-03", to: "2026-12-01" },
    { maxPrice: NaN }, { maxPrice: -1 }, { near: { latitude: 91, longitude: 139, radiusKm: 10 } },
    { arbitrary: "value" }, { discipline: "RACE" }]) {
    assert.equal(filterSchema.safeParse(invalid).success, false);
  }
  assert.equal(filterSchema.safeParse({ from: "2028-02-29" }).success, true);
});
test("search URLs round-trip every non-location filter without leaking coordinates", () => {
  const filters = filterSchema.parse({
    query: "筑波", circuit: "tsukuba", region: "Kanto", discipline: "GRIP",
    from: "2026-12-01", to: "2026-12-31", beginner: true, maxPrice: 0,
    near: { latitude: 35.12345, longitude: 139.54321, radiusKm: 50 }
  });
  const url = new URL(searchUrl(filters), "https://example.test");
  assert.deepEqual(filtersFromParams(url.searchParams), { ...filters, near: null });
  assert.ok(!url.toString().includes("35.12345"));
});
test("results are sorted by start time and missing circuit references are omitted", () => {
  const fixture = [...events].reverse();
  fixture.push({ ...events[0], id: "orphan", circuitId: "unknown" });
  const result = filterEvents(fixture, demoCircuits, emptyFilters);
  assert.deepEqual(result.map((event) => event.id), events.map((event) => event.id));
});
