import type { Database } from "@/integrations/supabase/types";
import { safeDbError } from "../safe-error.server";

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** The user's most recent subscription row, regardless of status. */
export async function getCurrentSubscription(userId: string): Promise<SubscriptionRow | null> {
  const db = await admin();
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) safeDbError(error, "subscription.service");
  return data;
}

export async function getSubscriptionById(id: string): Promise<SubscriptionRow | null> {
  const db = await admin();
  const { data, error } = await db.from("subscriptions").select("*").eq("id", id).maybeSingle();
  if (error) safeDbError(error, "subscription.service");
  return data;
}

export async function getSubscriptionByProviderId(
  provider: string,
  providerSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const db = await admin();
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("provider", provider)
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();
  if (error) safeDbError(error, "subscription.service");
  return data;
}

/** Creates a new subscription row in `pending` status — the provider hasn't confirmed payment yet. */
export async function createPendingSubscription(input: {
  userId: string;
  provider: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  plan?: "free" | "pro";
}): Promise<SubscriptionRow> {
  const db = await admin();
  const { data, error } = await db
    .from("subscriptions")
    .insert({
      user_id: input.userId,
      provider: input.provider,
      provider_customer_id: input.providerCustomerId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      plan: input.plan ?? "pro",
      status: "pending",
    })
    .select()
    .single();
  if (error) safeDbError(error, "subscription.service");
  return data;
}

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export async function getPaymentByProviderOrderId(
  provider: string,
  providerOrderId: string,
): Promise<PaymentRow | null> {
  const db = await admin();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("provider", provider)
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (error) safeDbError(error, "subscription.service");
  return data;
}

export async function updatePaymentFromWebhook(input: {
  paymentRowId: string;
  providerPaymentId: string;
  status: "succeeded" | "failed";
  paidAt: string | null;
}): Promise<PaymentRow> {
  const db = await admin();
  const { data, error } = await db
    .from("payments")
    .update({
      provider_payment_id: input.providerPaymentId,
      status: input.status,
      paid_at: input.paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.paymentRowId)
    .select()
    .single();
  if (error) safeDbError(error, "subscription.service");
  return data;
}

/** A first-time (never activated) subscription whose payment failed — bookkeeping only, no entitlement change. */
export async function markSubscriptionNeverActivated(subscriptionId: string): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("subscriptions")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("status", "pending");
  if (error) safeDbError(error, "subscription.service");
}

export async function listPaymentsForUser(userId: string, limit = 10) {
  const db = await admin();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) safeDbError(error, "subscription.service");
  return data ?? [];
}
