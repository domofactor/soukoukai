export function hasPro(billing: {
  status: string;
  currentPeriodEnd: Date | null;
} | null, now = new Date()) {
  return Boolean(billing && ["active", "trialing"].includes(billing.status) &&
    billing.currentPeriodEnd && billing.currentPeriodEnd > now);
}
