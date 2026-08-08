"use server";

import { z } from "zod";
import { resolveOwner } from "@/server/files.server";
import { createCheckoutForUser } from "@/server/billing/checkout.service";
import { getPaymentByProviderOrderId } from "@/server/billing/subscription.service";
import { getCurrentEntitlement } from "@/server/billing/entitlement.service";

const token = z.string().nullish();

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
