import { BILLING_PLANS, type BillingPlanConfig } from "@/lib/billing-config";
import * as billing from "./billing.service";
import { createPendingSubscription, getSubscriptionById } from "./subscription.service";
import { safeDbError } from "../safe-error.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function periodEndFor(plan: BillingPlanConfig, from: Date): string {
  const end = new Date(from);
  if (plan.interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

async function recordPayment(input: {
  userId: string;
  subscriptionId: string;
  plan: BillingPlanConfig;
  status: "succeeded" | "failed";
}) {
  const db = await admin();
  const now = new Date().toISOString();
  const { error } = await db.from("payments").insert({
    user_id: input.userId,
    subscription_id: input.subscriptionId,
    provider: "mock",
    provider_payment_id: `mock_${crypto.randomUUID()}`,
    amount_cents: input.plan.amount,
    currency: input.plan.currency,
    status: input.status,
    plan: input.plan.plan,
    paid_at: input.status === "succeeded" ? now : null,
  });
  if (error) safeDbError(error, "mock-events");
}

/** Free → Pending Pro → Active Pro, without a real charge: creates a subscription, records payment, activates Pro. */
export async function mockSubscribe(userId: string, planId: "pro_monthly" | "pro_yearly") {
  const plan = BILLING_PLANS[planId];
  const subscription = await createPendingSubscription({
    userId,
    provider: "mock",
    providerSubscriptionId: `mock_sub_${crypto.randomUUID()}`,
    plan: "pro",
  });

  const periodStart = new Date().toISOString();
  const periodEnd = periodEndFor(plan, new Date());

  await recordPayment({ userId, subscriptionId: subscription.id, plan, status: "succeeded" });
  await billing.activatePro({
    userId,
    source: "subscription",
    subscriptionId: subscription.id,
    periodStart,
    periodEnd,
  });

  return subscription.id;
}

/** Simulates a successful renewal payment: extends the period and stays active. */
export async function mockRenew(subscriptionId: string, planId: "pro_monthly" | "pro_yearly") {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  const plan = BILLING_PLANS[planId];
  const periodEnd = periodEndFor(plan, new Date());

  await recordPayment({
    userId: subscription.user_id,
    subscriptionId,
    plan,
    status: "succeeded",
  });
  await billing.activatePro({
    userId: subscription.user_id,
    source: "subscription",
    subscriptionId,
    periodStart: new Date().toISOString(),
    periodEnd,
  });
}

/** Simulates a failed renewal charge: records the failed payment, marks the subscription past_due. */
export async function mockPaymentFailure(
  subscriptionId: string,
  planId: "pro_monthly" | "pro_yearly",
) {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  const plan = BILLING_PLANS[planId];

  await recordPayment({ userId: subscription.user_id, subscriptionId, plan, status: "failed" });
  await billing.markPastDue(subscriptionId);
}

/** Simulates the retried charge succeeding: past_due → active again. */
export async function mockRecoverPayment(
  subscriptionId: string,
  planId: "pro_monthly" | "pro_yearly",
) {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  const plan = BILLING_PLANS[planId];
  const periodEnd = periodEndFor(plan, new Date());

  await recordPayment({ userId: subscription.user_id, subscriptionId, plan, status: "succeeded" });
  await billing.recoverSubscription(subscriptionId, periodEnd);
}

export async function mockCancel(subscriptionId: string, atPeriodEnd: boolean) {
  await billing.cancelSubscription(subscriptionId, atPeriodEnd);
}

export async function mockExpire(subscriptionId: string) {
  await billing.expireSubscription(subscriptionId);
}
