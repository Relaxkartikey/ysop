export { getCurrentSubscription } from "./subscription.service";
export { getCurrentEntitlement } from "./entitlement.service";
import { safeDbError } from "../safe-error.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type EntitlementSource = "default" | "subscription" | "manual" | "dev";

/**
 * Grants Pro. With a `subscriptionId`, the linked subscription row is activated too.
 * Without one, it's a manual or internal grant with no backing subscription.
 * Runs as a single DB transaction (Postgres function).
 */
export async function activatePro(input: {
  userId: string;
  source: EntitlementSource;
  subscriptionId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("billing_activate_pro", {
    p_user_id: input.userId,
    p_source: input.source,
    p_subscription_id: input.subscriptionId ?? undefined,
    p_period_start: input.periodStart ?? undefined,
    p_period_end: input.periodEnd ?? undefined,
  });
  if (error) safeDbError(error, "billing.service");
}

export async function downgradeToFree(
  userId: string,
  source: EntitlementSource = "default",
): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("billing_downgrade_to_free", {
    p_user_id: userId,
    p_source: source,
  });
  if (error) safeDbError(error, "billing.service");
}

/** `atPeriodEnd: true` keeps Pro active until `billing_expire_subscription` runs at renewal time. */
export async function cancelSubscription(
  subscriptionId: string,
  atPeriodEnd: boolean,
): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("billing_cancel_subscription", {
    p_subscription_id: subscriptionId,
    p_cancel_at_period_end: atPeriodEnd,
  });
  if (error) safeDbError(error, "billing.service");
}

/** Called when a subscription's period ends without renewal — drops the user to Free. */
export async function expireSubscription(subscriptionId: string): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("billing_expire_subscription", {
    p_subscription_id: subscriptionId,
  });
  if (error) safeDbError(error, "billing.service");
}

/** Payment failed on renewal — Pro features stay on during the grace period, tracked via status. */
export async function markPastDue(subscriptionId: string): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("billing_mark_past_due", {
    p_subscription_id: subscriptionId,
  });
  if (error) safeDbError(error, "billing.service");
}

/** A past-due subscription's payment succeeded — restores active status and extends the period. */
export async function recoverSubscription(
  subscriptionId: string,
  periodEnd: string,
): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("billing_recover_subscription", {
    p_subscription_id: subscriptionId,
    p_period_end: periodEnd,
  });
  if (error) safeDbError(error, "billing.service");
}
