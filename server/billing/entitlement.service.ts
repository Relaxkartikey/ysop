async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Entitlement = {
  userId: string;
  plan: "free" | "pro";
  source: "default" | "subscription" | "manual" | "dev";
  status: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
};

/** Full entitlement snapshot from `user_plans`, for the billing layer and admin panel. */
export async function getCurrentEntitlement(userId: string): Promise<Entitlement> {
  const db = await admin();
  const { data } = await db
    .from("user_plans")
    .select("plan, source, status, expires_at, subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      userId,
      plan: "free",
      source: "default",
      status: null,
      expiresAt: null,
      subscriptionId: null,
    };
  }

  return {
    userId,
    plan: data.plan === "pro" ? "pro" : "free",
    source: (data.source as Entitlement["source"]) ?? "default",
    status: data.status,
    expiresAt: data.expires_at,
    subscriptionId: data.subscription_id,
  };
}
