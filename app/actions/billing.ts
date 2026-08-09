"use server";

import { z } from "zod";
import { resolveOwner } from "@/server/files.server";
import { createCheckoutForUser } from "@/server/billing/checkout.service";
import {
  getPaymentByProviderOrderId,
  getSubscriptionById,
  listPaymentsForUser,
} from "@/server/billing/subscription.service";
import { getCurrentEntitlement } from "@/server/billing/entitlement.service";
import { downgradeToFree, cancelSubscription } from "@/server/billing/billing.service";
import { mockClaimTrial } from "@/server/billing/mock-events";

const token = z.string().nullish();

export async function claimFreeTrialAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  const owner = await resolveOwner(data.accessToken);
  const entitlement = await getCurrentEntitlement(owner.userId);
  if (entitlement.plan === "pro") throw new Error("You're already on Pro.");
  await mockClaimTrial(owner.userId);
  return { ok: true };
}

export async function getSubscriptionDetailsAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  const owner = await resolveOwner(data.accessToken);
  const entitlement = await getCurrentEntitlement(owner.userId);

  if (entitlement.plan !== "pro" || !entitlement.subscriptionId) {
    return { plan: entitlement.plan, subscription: null };
  }

  const subscription = await getSubscriptionById(entitlement.subscriptionId);
  const payments = await listPaymentsForUser(owner.userId, 20);
  const latestPayment = payments.find(
    (p) => p.subscription_id === entitlement.subscriptionId && p.status === "succeeded",
  );

  return {
    plan: "pro" as const,
    subscription: subscription
      ? {
          since: subscription.current_period_start ?? subscription.created_at,
          expiresAt: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          amountCents: latestPayment?.amount_cents ?? null,
          currency: latestPayment?.currency ?? null,
        }
      : null,
  };
}

export async function cancelProAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  const owner = await resolveOwner(data.accessToken);
  const entitlement = await getCurrentEntitlement(owner.userId);
  if (entitlement.subscriptionId) {
    // Real paid subscription — cancel at period end so Pro stays on until it lapses naturally.
    await cancelSubscription(entitlement.subscriptionId, true);
  } else {
    // Manual/dev grant with no backing subscription — drop immediately.
    await downgradeToFree(owner.userId, "manual");
  }
  return { ok: true };
}

export async function createCheckoutAction(input: unknown) {
  const data = z
    .object({
      planId: z.enum(["pro_monthly", "pro_yearly"]),
      customerPhone: z.string().min(6).max(15),
      customerName: z.string().max(100).nullish(),
      origin: z.string().url(),
      accessToken: token,
    })
    .parse(input);

  const owner = await resolveOwner(data.accessToken);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(owner.userId);
  const email = authUser?.user?.email;
  if (!email) throw new Error("Your account has no email on file.");

  return createCheckoutForUser({
    userId: owner.userId,
    planId: data.planId,
    origin: data.origin,
    customer: { email, phone: data.customerPhone, name: data.customerName ?? undefined },
  });
}

/**
 * Polled by the `/checkout/return` processing page — reports our *internal* record's
 * status, never the provider's directly, and never activates anything itself. Pro only
 * ever turns on once the verified webhook has run.
 */
export async function getCheckoutStatusAction(input: unknown) {
  const data = z.object({ orderId: z.string().min(1), accessToken: token }).parse(input);
  const owner = await resolveOwner(data.accessToken);

  const payment = await getPaymentByProviderOrderId("cashfree", data.orderId);
  if (!payment || payment.user_id !== owner.userId) {
    throw new Error("Order not found.");
  }

  const entitlement = await getCurrentEntitlement(owner.userId);
  return {
    paymentStatus: payment.status,
    plan: entitlement.plan,
  };
}
