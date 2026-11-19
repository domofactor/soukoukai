import Stripe from "stripe";
import { db } from "./db";
import { isDemo } from "./data";
import { hasPro, membershipForAccount, type Membership } from "./entitlements";

export function priceForPlan(plan: Membership) {
  const attendee = process.env.STRIPE_ATTENDEE_PRICE_ID || process.env.STRIPE_PRICE_ID;
  const organizer = process.env.STRIPE_ORGANIZER_PRICE_ID;
  if (organizer && [attendee, process.env.STRIPE_PRICE_ID].includes(organizer)) {
    throw new Error("Organizer and attendee prices must be distinct.");
  }
  return plan === "ATTENDEE" ? attendee : organizer;
}

export function acceptedPriceIds(plan: Membership) {
  const current = priceForPlan(plan);
  return [...new Set([current, ...(plan === "ATTENDEE" ? [process.env.STRIPE_PRICE_ID] : [])]
    .filter((id): id is string => Boolean(id)))];
}

export function billingReady(plan?: Membership) {
  return !isDemo() && Boolean(process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXTAUTH_URL && (!plan || priceForPlan(plan)));
}

export function validatePrice(price: Stripe.Price) {
  if (!price.active || price.type !== "recurring" || price.currency !== "jpy" ||
    price.unit_amount === null || price.billing_scheme !== "per_unit" || price.recurring?.usage_type !== "licensed") {
    throw new Error("Membership prices must be active, fixed-price, licensed recurring JPY prices.");
  }
}

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 10000 });
}

export async function proForUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { billing: true } });
  return Boolean(user && user.accountType !== "ORGANIZER" && hasPro(user.billing));
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
    const billing = await tx.billing.findUnique({ where: { stripeCustomerId: customerId }, include: { user: true } });
    if (!billing) throw new Error("Subscription customer is not linked to an account.");
    const subscriptions: Stripe.Subscription[] = [];
    const plan = membershipForAccount(billing.user.accountType);
    const priceIds = acceptedPriceIds(plan);
    for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
      if (subscription.items.data.some((item) => priceIds.includes(item.price.id))) {
        subscriptions.push(subscription);
      }
    }
    const subscription = subscriptions.sort((a, b) => {
      const rank = (value: Stripe.Subscription) => ["active", "trialing"].includes(value.status) ? 1 : 0;
      return rank(b) - rank(a) || b.created - a.created;
    })[0];
    const item = subscription?.items.data.find((entry) => priceIds.includes(entry.price.id));
    await tx.billing.update({
      where: { userId: billing.userId },
      data: {
        stripeSubscriptionId: subscription?.id ?? null,
        plan,
        status: subscription?.status ?? "inactive",
        currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null
      }
    });
  }, { timeout: 30000 });
}
