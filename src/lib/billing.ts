import Stripe from "stripe";
import { db } from "./db";
import { isDemo } from "./data";
import { hasPro } from "./entitlements";

export function billingReady() {
  return !isDemo() && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID &&
    process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXTAUTH_URL);
}

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 10000 });
}

export async function proForUser(userId: string) {
  return hasPro(await db.billing.findUnique({ where: { userId } }));
}

export function appUrl(path: string) {
  const base = process.env.NEXTAUTH_URL;
  if (!base) throw new Error("NEXTAUTH_URL is required.");
  return new URL(path, base).toString();
}

export async function syncCustomer(customerId: string) {
  const stripe = stripeClient();
  await db.$transaction(async (tx) => {
    // Serialize customer updates before reading Stripe; concurrent webhooks cannot overwrite newer state.
    await tx.$queryRaw`SELECT "userId" FROM "Billing" WHERE "stripeCustomerId" = ${customerId} FOR UPDATE`;
    const billing = await tx.billing.findUnique({ where: { stripeCustomerId: customerId } });
    if (!billing) throw new Error("Subscription customer is not linked to an account.");
    const subscriptions: Stripe.Subscription[] = [];
    for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
      if (subscription.items.data.some((item) => item.price.id === process.env.STRIPE_PRICE_ID)) {
        subscriptions.push(subscription);
      }
    }
    const subscription = subscriptions.sort((a, b) => {
      const rank = (value: Stripe.Subscription) => ["active", "trialing"].includes(value.status) ? 1 : 0;
      return rank(b) - rank(a) || b.created - a.created;
    })[0];
    const item = subscription?.items.data.find((entry) => entry.price.id === process.env.STRIPE_PRICE_ID);
    await tx.billing.update({
      where: { userId: billing.userId },
      data: {
        stripeSubscriptionId: subscription?.id ?? null,
        status: subscription?.status ?? "inactive",
        currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null
      }
    });
  }, { timeout: 30000 });
}
