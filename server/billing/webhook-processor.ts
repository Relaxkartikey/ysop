import { BILLING_PLANS, type BillingPlanConfig } from "@/lib/billing-config";
import * as billing from "./billing.service";
import {
  getPaymentByProviderOrderId,
  updatePaymentFromWebhook,
  markSubscriptionNeverActivated,
  getSubscriptionById,
} from "./subscription.service";
import type { WebhookEvent } from "./providers/provider.interface";
import type { CashfreeWebhookPayload } from "./providers/cashfree/cashfree.types";

function periodEndFor(plan: BillingPlanConfig, from: Date): string {
  const end = new Date(from);
  if (plan.interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

/**
 * Single entry point for provider webhooks. Maps a verified event to the `payments`
 * ledger and calls billing.service for any entitlement transition — never touches
 * `user_plans` directly.
 */
export async function processPaymentWebhook(event: WebhookEvent): Promise<void> {
  if (
    event.type !== "PAYMENT_SUCCESS_WEBHOOK" &&
    event.type !== "PAYMENT_FAILED_WEBHOOK" &&
    event.type !== "PAYMENT_USER_DROPPED_WEBHOOK"
  ) {
    return; // event type we don't act on (yet) — acknowledge and ignore
  }

  const payload = event.payload as CashfreeWebhookPayload;
  const orderId = payload.data.order.order_id;
  const cfPaymentId = payload.data.payment.cf_payment_id;

  const payment = await getPaymentByProviderOrderId("cashfree", orderId);
  if (!payment) {
    // Order we have no record of (not created via our checkout flow) — nothing to reconcile.
    return;
  }

  // Idempotent: a redelivered webhook for an already-terminal payment is a no-op.
  if (payment.status === "succeeded" || payment.status === "failed") return;

  if (!payment.subscription_id) return;
  const subscription = await getSubscriptionById(payment.subscription_id);
  if (!subscription) return;

  const planId = (payment.metadata as { plan_id?: string } | null)?.plan_id;
  const plan = planId ? BILLING_PLANS[planId as keyof typeof BILLING_PLANS] : undefined;

  if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
    await updatePaymentFromWebhook({
      paymentRowId: payment.id,
      providerPaymentId: cfPaymentId,
      status: "succeeded",
      paidAt: payload.data.payment.payment_time,
    });

    const periodEnd = plan ? periodEndFor(plan, new Date()) : null;

    // A different subscription previously held this user's entitlement (e.g. a prior
    // renewal cycle) — close it out so only the new one is "current".
    const entitlement = await billing.getCurrentEntitlement(subscription.user_id);
    if (entitlement.subscriptionId && entitlement.subscriptionId !== subscription.id) {
      await billing.expireSubscription(entitlement.subscriptionId);
    }

    // Same call whether this is the first activation or a renewal of an already-active one.
    await billing.activatePro({
      userId: subscription.user_id,
      source: "subscription",
      subscriptionId: subscription.id,
      periodStart: new Date().toISOString(),
      periodEnd: periodEnd ?? undefined,
    });
    return;
  }

  // PAYMENT_FAILED_WEBHOOK / PAYMENT_USER_DROPPED_WEBHOOK
  await updatePaymentFromWebhook({
    paymentRowId: payment.id,
    providerPaymentId: cfPaymentId,
    status: "failed",
    paidAt: null,
  });

  if (subscription.status === "active") {
    // A renewal charge failed on an already-Pro subscription — grace period, not an immediate downgrade.
    await billing.markPastDue(subscription.id);
  } else if (subscription.status === "pending") {
    // First payment never went through — user was never entitled, nothing to revoke.
    await markSubscriptionNeverActivated(subscription.id);
  }
}
