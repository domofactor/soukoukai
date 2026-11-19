import { after, test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { POST as webhook } from "../src/app/api/stripe/webhook/route";
import { GET as alerts } from "../src/app/api/cron/alerts/route";

const keys = ["DEMO_MODE", "DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET", "NEXTAUTH_URL", "CRON_SECRET", "RESEND_API_KEY", "EMAIL_FROM"] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
after(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});
function configure() {
  process.env.DEMO_MODE = "false";
  process.env.DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_not_a_real_key";
  process.env.STRIPE_PRICE_ID = "price_test_placeholder";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder_not_a_real_secret";
  process.env.NEXTAUTH_URL = "https://example.test";
}

test("demo mode disables billing and scheduled mail without touching services", async () => {
  process.env.DEMO_MODE = "true";
  assert.equal((await webhook(new Request("https://example.test/api/stripe/webhook", { method: "POST" }))).status, 503);
  assert.equal((await alerts(new Request("https://example.test/api/cron/alerts"))).status, 503);
});
test("billing webhook rejects missing and invalid signatures before accessing the database", async () => {
  configure();
  assert.equal((await webhook(new Request("https://example.test", { method: "POST", body: "{}" }))).status, 400);
  assert.equal((await webhook(new Request("https://example.test", {
    method: "POST", body: "{}", headers: { "stripe-signature": "invalid" }
  }))).status, 400);
});
test("billing webhook accepts an authentic ignored event and tolerates repeated deliveries", async () => {
  configure();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const payload = JSON.stringify({ id: "evt_test_placeholder", type: "product.updated", data: { object: {} } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await webhook(new Request("https://example.test", {
      method: "POST", body: payload, headers: { "stripe-signature": signature }
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
  }
});
test("alert endpoint rejects unauthenticated callers before querying users", async () => {
  configure();
  process.env.RESEND_API_KEY = "re_placeholder_not_a_real_key";
  process.env.EMAIL_FROM = "preview@example.test";
  process.env.CRON_SECRET = "placeholder_not_a_real_cron_secret";
  assert.equal((await alerts(new Request("https://example.test"))).status, 401);
  assert.equal((await alerts(new Request("https://example.test", { headers: { authorization: "Bearer wrong" } }))).status, 401);
});
