export const accountTypes = ["DRIVER", "SPECTATOR", "ORGANIZER"] as const;
export type AccountType = typeof accountTypes[number];
export type Membership = "ATTENDEE" | "ORGANIZER";
export function membershipForAccount(accountType: AccountType | null): Membership {
  return accountType === "ORGANIZER" ? "ORGANIZER" : "ATTENDEE";
}
export type BillingAccess = {
  status: string;
  currentPeriodEnd: Date | null;
  plan: Membership;
};
export function hasMembership(billing: BillingAccess | null, plan: Membership, now = new Date()) {
  return Boolean(billing && billing.plan === plan && ["active", "trialing"].includes(billing.status) &&
    billing.currentPeriodEnd && billing.currentPeriodEnd > now);
}
export function hasPro(billing: BillingAccess | null, now = new Date()) {
  return hasMembership(billing, "ATTENDEE", now);
}
