"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { billingReady, stripeClient, appUrl, proForUser, priceForPlan, validatePrice } from "@/lib/billing";
import { filterSchema } from "@/lib/search";
import { getLocale } from "@/lib/server-locale";
import { localizedPath, translator } from "@/lib/locale";
import { accountTypes, membershipForAccount } from "@/lib/entitlements";

export async function startCheckout() {
  const locale = await getLocale();
  const path = (value: string) => localizedPath(value, locale);
  const user = await currentUser();
  if (!user?.email) redirect(path("/signin"));
  if (!user.onboarded) redirect(path("/onboarding"));
  const plan = membershipForAccount(user.accountType);
  if (!billingReady(plan)) redirect(path("/membership?error=setup"));
  const stripe = stripeClient();
  const priceId = priceForPlan(plan)!;
  validatePrice(await stripe.prices.retrieve(priceId));
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
      return appUrl(path("/account?notice=existing"));
    }
    const open = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    const pending = open.data.find((session) => session.mode === "subscription" && session.client_reference_id === user.id);
    if (pending?.url && pending.metadata?.plan === plan && pending.metadata?.priceId === priceId) return pending.url;
    if (pending) await stripe.checkout.sessions.expire(pending.id);
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      locale: locale === "ja" ? "ja" : "en",
      metadata: { plan, priceId },
      success_url: appUrl(path("/account?notice=checkout")),
      cancel_url: appUrl(path("/membership")),
      allow_promotion_codes: true,
      subscription_data: { metadata: { userId: user.id, plan } }
    }, { idempotencyKey: `checkout-${user.id}-${priceId}-${subscriptions.data[0]?.id ?? "new"}-${Math.floor(Date.now() / 600000)}` });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return session.url;
  }, { timeout: 30000 });
  redirect(target);
}

export async function openBillingPortal() {
  const locale = await getLocale();
  const t = translator(locale);
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (!billingReady()) throw new Error(t("Billing is not configured.", "決済はまだ設定されていません。"));
  const billing = await db.billing.findUnique({ where: { userId: user.id } });
  if (!billing) throw new Error(t("No billing account was found.", "決済アカウントが見つかりません。"));
  const session = await stripeClient().billingPortal.sessions.create({
    customer: billing.stripeCustomerId, return_url: appUrl(localizedPath("/account", locale)),
    locale: locale === "ja" ? "ja" : "en"
  });
  redirect(session.url);
}

export async function saveSearch(input: unknown) {
  const locale = await getLocale();
  const t = translator(locale);
  const user = await currentUser();
  if (!user) return { error: t("Sign in before saving a search.", "検索を保存するにはログインしてください。") };
  if (!await proForUser(user.id)) return { error: t("An active Driver / Spectator Pro subscription is required.", "有効なドライバー・観客向け Pro 会員登録が必要です。") };
  const parsed = z.object({
    name: z.string().trim().min(1).max(80),
    filters: filterSchema,
    alerts: z.boolean()
  }).safeParse(input);
  if (!parsed.success) return { error: t("Check the search name and filters.", "検索名と絞り込み条件を確認してください。") };
  if (parsed.data.alerts && (!process.env.RESEND_API_KEY || !process.env.CRON_SECRET)) {
    return { error: t("Email alerts are not configured yet. Save without alerts instead.", "メール通知は未設定です。通知なしで保存してください。") };
  }
  // The serializable transaction prevents concurrent requests bypassing the account limit.
  try {
    await db.$transaction(async (tx) => {
      const count = await tx.savedSearch.count({ where: { userId: user.id } });
      if (count >= 20) throw new Error("SEARCH_LIMIT");
      await tx.savedSearch.create({
        data: { userId: user.id, name: parsed.data.name, alerts: parsed.data.alerts, locale,
          filters: { ...parsed.data.filters, near: null } }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "SEARCH_LIMIT") return { error: t("You can save up to 20 searches.", "保存できる検索は20件までです。") };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: t("Another search was saved at the same time. Please try again.", "同時に別の保存が行われました。もう一度お試しください。") };
    }
    console.error("Saving search failed", error);
    return { error: t("Your search could not be saved. Please try again.", "検索を保存できませんでした。もう一度お試しください。") };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function completeOnboarding(form: FormData) {
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) redirect(localizedPath("/signin", locale));
  const accountType = z.enum(accountTypes).safeParse(form.get("accountType"));
  if (!accountType.success) redirect(localizedPath("/onboarding?error=type", locale));
  // A verified, authenticated account chooses once. Billing never trusts callback query parameters.
  const updated = await db.user.updateMany({
    where: { id: user.id, onboarded: false, OR: [
      { billing: { is: null } }, { billing: { is: { plan: membershipForAccount(accountType.data) } } }
    ] },
    data: { accountType: accountType.data, onboarded: true, locale }
  });
  if (!updated.count && !user.onboarded) redirect(localizedPath("/onboarding?error=type", locale));
  revalidatePath("/account");
  redirect(localizedPath("/account", locale));
}

export async function deleteSearch(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const id = z.string().min(1).max(100).parse(form.get("id"));
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account");
}
