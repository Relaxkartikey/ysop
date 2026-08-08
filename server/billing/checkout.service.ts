import { BILLING_PLANS, type BillingPlanConfig } from "@/lib/billing-config";
import { getPaymentProvider } from "./providers";
import { createPendingSubscription } from "./subscription.service";
import { safeDbError } from "../safe-error.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Creates the pending subscription and payment rows before contacting the provider,
 * so a fast webhook has something to match against. The server always resolves the
 * plan/amount from `lib/billing-config.ts` — never trusts a client-supplied price.
 */
export async function createCheckoutForUser(input: {
  userId: string;
  planId: "pro_monthly" | "pro_yearly";
  provider?: string;
  origin: string;
  customer: { email: string; phone: string; name?: string };
}): Promise<{ url: string }> {
  const { rateLimit } = await import("../rate-limit.server");
  await rateLimit(`checkout:${input.userId}`, 10, 300);

  const plan: BillingPlanConfig | undefined = BILLING_PLANS[input.planId];
  if (!plan) throw new Error(`Unknown billing plan: ${input.planId}`);

  const providerName = input.provider ?? "cashfree";
  const subscription = await createPendingSubscription({
    userId: input.userId,
    provider: providerName,
    plan: "pro",
  });

  const provider = await getPaymentProvider(providerName);
  const session = await provider.createCheckout({
    userId: input.userId,
    plan,
    // Cashfree substitutes the literal `{order_id}` placeholder before redirecting back.
    successUrl: `${input.origin}/checkout/return?order_id={order_id}`,
    cancelUrl: `${input.origin}/checkout`,
    customer: input.customer,
  });

  const db = await admin();
  const { error } = await db.from("payments").insert({
    user_id: input.userId,
    subscription_id: subscription.id,
    provider: providerName,
    provider_order_id: session.providerOrderId ?? session.providerSessionId,
    amount_cents: plan.amount,
    currency: plan.currency,
    status: "pending",
    plan: plan.plan,
    metadata: { plan_id: plan.id },
  });
  if (error) safeDbError(error, "checkout.service");

  return { url: session.url };
}
