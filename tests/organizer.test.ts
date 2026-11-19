import test from "node:test";
import assert from "node:assert/strict";
import { canManage, canPublish, organizerEventSchema, descriptionUpdate, type OrganizerActor } from "../src/lib/organizer-policy";
import { disciplines } from "../src/lib/event-types";
import { eventImportSchema } from "../src/lib/import-schema";
import { demoCircuits, demoEvents } from "../src/lib/demo";
import { emptyFilters, filterEvents, filtersFromParams, searchUrl } from "../src/lib/search";
import { eventDescription, publicEventsWhere } from "../src/lib/event-visibility";
import { alertMessage } from "../src/lib/alert-message";

const now = new Date("2026-11-19T00:00:00Z");
const actor: OrganizerActor = { id: "owner", accountType: "ORGANIZER", onboarded: true,
  billing: { plan: "ORGANIZER", status: "active", currentPeriodEnd: new Date("2027-01-01") } };
const own = { ownerId: "owner", status: "DRAFT" };

test("ownership gates distinguish operator, another organizer, Driver and Spectator", () => {
  assert.equal(canManage(actor, own), true);
  assert.equal(canManage(actor, { ...own, status: "ORGANIZER" }), true);
  assert.equal(canManage(actor, { ...own, ownerId: "someone-else" }), false);
  assert.equal(canManage(actor, { ownerId: null, status: "VERIFIED" }), false);
  assert.equal(canManage(actor, { ...own, status: "VERIFIED" }), false);
  for (const accountType of ["DRIVER", "SPECTATOR", null] as const) {
    assert.equal(canManage({ ...actor, accountType }, own), false);
    assert.equal(canPublish({ ...actor, accountType }, now), false);
  }
  assert.equal(canPublish({ ...actor, onboarded: false }, now), false);
});
test("lapsed organizers can withdraw/delete their own listings but not edit/publish", () => {
  for (const billing of [null, { ...actor.billing!, plan: "ATTENDEE" as const },
    { ...actor.billing!, status: "past_due" }, { ...actor.billing!, currentPeriodEnd: now }]) {
    const lapsed = { ...actor, billing };
    assert.equal(canManage(lapsed, own), true);
    assert.equal(canPublish(lapsed, now), false);
  }
  assert.equal(canPublish(actor, now), true);
});
test("every event type works in organizer/import schemas, saved URLs, filters and both alert languages", () => {
  const event = demoEvents(now)[0];
  for (const discipline of disciplines) {
    const listing = { ...event, discipline, status: "ORGANIZER" as const };
    assert.equal(organizerEventSchema.safeParse({
      title: "Test", organizer: "Organizer", circuitId: "tsukuba", startsAt: "2027-01-01T10:00:00+09:00",
      priceYen: null, discipline, beginner: false, sourceUrl: "https://example.test/event",
      descriptionOriginal: "", descriptionLanguage: "ja", descriptionTranslation: ""
    }).success, true);
    assert.equal(eventImportSchema.safeParse([{
      id: discipline.toLowerCase().replaceAll("_", "-"), title: "Test", organizer: "Organizer",
      circuitId: "tsukuba", startsAt: "2027-01-01T10:00:00+09:00", priceYen: null,
      discipline, beginner: false, sourceUrl: "https://example.test/event", verifiedAt: now.toISOString()
    }]).success, true);
    const filters = { ...emptyFilters, discipline };
    assert.equal(filtersFromParams(new URL(searchUrl(filters), "https://example.test").searchParams).discipline, discipline);
    assert.equal(filterEvents([listing], demoCircuits, filters).length, 1);
    assert.match(alertMessage(listing, demoCircuits[0], "Saved", "en", (path) => path).text, /not independently verified/);
    assert.match(alertMessage(listing, demoCircuits[0], "保存", "ja", (path) => path).text, /主催者提供・独立検証なし/);
  }
  assert.deepEqual(new Set(demoEvents(now).map((event) => event.discipline)), new Set(disciplines));
});
test("organizer input cannot self-assign verification, ownership, a plan or a public status", () => {
  const input = {
    title: "Event", organizer: "Organizer", circuitId: "fuji", startsAt: "2027-01-01T10:00:00+09:00",
    priceYen: null, discipline: "SHOW", beginner: false, sourceUrl: "https://example.test",
    descriptionOriginal: "", descriptionLanguage: "en", descriptionTranslation: ""
  };
  for (const key of ["ownerId", "verifiedAt", "status", "plan", "translationStatus"]) {
    assert.equal(organizerEventSchema.safeParse({ ...input, [key]: "tampered" }).success, false);
  }
  assert.equal(organizerEventSchema.safeParse({ ...input, sourceUrl: "javascript:alert(1)" }).success, false);
});
test("description source is preserved and edited translations are never regenerated silently", () => {
  const previous = {
    descriptionOriginal: "Original", descriptionLanguage: "en", descriptionTranslation: "手動翻訳",
    translationStatus: "EDITED" as const, translationEdited: true
  };
  const input = { descriptionOriginal: "Updated original", descriptionLanguage: "en" as const, descriptionTranslation: "手動翻訳" };
  const update = descriptionUpdate(input, previous);
  assert.equal(update.descriptionOriginal, input.descriptionOriginal);
  assert.equal(update.descriptionTranslation, "手動翻訳");
  assert.equal(update.translationStatus, "STALE");
  assert.equal(update.translationEdited, true);
  assert.equal(update.generate, false);
  assert.equal(descriptionUpdate(input, { ...previous, translationStatus: "STALE" }).generate, false);
  assert.equal(descriptionUpdate(input, { ...previous, translationStatus: "AUTO", translationEdited: false }).generate, true);
  assert.equal(descriptionUpdate({ ...input, descriptionTranslation: "新しい翻訳" }, previous).translationStatus, "EDITED");
  assert.equal(descriptionUpdate({ ...input, descriptionTranslation: "" }, previous).generate, true);
  assert.equal(descriptionUpdate({ ...input, descriptionOriginal: "" }, previous).descriptionTranslation, null);
});
test("public descriptions hide failed/stale translations but retain the labelled original", () => {
  const event = { ...demoEvents(now)[0], descriptionLanguage: "ja", descriptionOriginal: "原文", descriptionTranslation: "Translation" };
  for (const translationStatus of ["NONE", "STALE", "FAILED"] as const) {
    assert.equal(eventDescription({ ...event, translationStatus }, "en").text, "原文");
    assert.equal(eventDescription({ ...event, translationStatus }, "en").translated, false);
  }
  assert.equal(eventDescription({ ...event, translationStatus: "AUTO" }, "en").automatic, true);
  assert.equal(eventDescription({ ...event, translationStatus: "EDITED" }, "en").text, "Translation");
  assert.equal(eventDescription(event, "ja").text, "原文");
});
test("public and alert visibility only includes upcoming verified or organizer-published listings", () => {
  assert.deepEqual(publicEventsWhere(now), { startsAt: { gte: now }, OR: [
    { status: "VERIFIED", ownerId: null, verifiedAt: { not: null } },
    { status: "ORGANIZER", ownerId: { not: null } }
  ] });
});
