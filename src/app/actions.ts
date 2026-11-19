"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { billingReady, stripeClient, appUrl, proForUser } from "@/lib/billing";
import { filterSchema } from "@/lib/search";

export async function startCheckout() {
  const user = await currentUser();
  if (!user?.email) redirect("/signin");
  if (!billingReady()) redirect("/membership?error=setup");
  const stripe = stripeClient();
  let billing = await db.billing.findUnique({ where: { userId: user.id } });
  if (!billing) {
    const customer = await stripe.customers.create({
      email: user.email, metadata: { userId: user.id }
    }, { idempotencyKey: `customer-${user.id}` });
    billing = await db.billing.upsert({
      where: { userId: user.id }, update: {},
      create: { userId: user.id, stripeCustomerId: customer.id }
    });
  }
  const customerId = billing.stripeCustomerId;
  const target = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "Billing" WHERE "userId" = ${user.id} FOR UPDATE`;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some((subscription) => !["canceled", "incomplete_expired"].includes(subscription.status))) {
      return appUrl("/account?notice=existing");
    }
    const open = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    const pending = open.data.find((session) => session.mode === "subscription" && session.client_reference_id === user.id);
    if (pending?.url) return pending.url;
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      client_reference_id: user.id,
      success_url: appUrl("/account?notice=checkout"),
      cancel_url: appUrl("/membership"),
      allow_promotion_codes: true,
      subscription_data: { metadata: { userId: user.id } }
    }, { idempotencyKey: `checkout-${user.id}-${subscriptions.data[0]?.id ?? "new"}-${Math.floor(Date.now() / 600000)}` });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return session.url;
  }, { timeout: 30000 });
  redirect(target);
}

export async function openBillingPortal() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (!billingReady()) throw new Error("Billing is not configured.");
  const billing = await db.billing.findUnique({ where: { userId: user.id } });
  if (!billing) throw new Error("No billing account was found.");
  const session = await stripeClient().billingPortal.sessions.create({
    customer: billing.stripeCustomerId, return_url: appUrl("/account")
  });
  redirect(session.url);
}

export async function saveSearch(input: unknown) {
  const user = await currentUser();
  if (!user) return { error: "Sign in before saving a search." };
  if (!await proForUser(user.id)) return { error: "An active Pro subscription is required." };
  const parsed = z.object({
    name: z.string().trim().min(1).max(80),
    filters: filterSchema,
    alerts: z.boolean()
  }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid search." };
  if (parsed.data.alerts && (!process.env.RESEND_API_KEY || !process.env.CRON_SECRET)) {
    return { error: "Email alerts are not configured yet. Save without alerts instead." };
  }
  // The serializable transaction prevents concurrent requests bypassing the account limit.
  try {
    await db.$transaction(async (tx) => {
      const count = await tx.savedSearch.count({ where: { userId: user.id } });
      if (count >= 20) throw new Error("SEARCH_LIMIT");
      await tx.savedSearch.create({
        data: { userId: user.id, name: parsed.data.name, alerts: parsed.data.alerts,
          filters: { ...parsed.data.filters, near: null } }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "SEARCH_LIMIT") return { error: "You can save up to 20 searches." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "Another search was saved at the same time. Please try again." };
    }
    console.error("Saving search failed", error);
    return { error: "Your search could not be saved. Please try again." };
  }
  revalidatePath("/account");
  return { success: true };
}

export async function deleteSearch(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const id = z.string().min(1).max(100).parse(form.get("id"));
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account");
}
