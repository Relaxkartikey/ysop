import { resolveOwner, type Owner } from "./files.server";
import type { Json } from "@/integrations/supabase/types";
import { safeDbError } from "./safe-error.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Verifies the caller is authenticated *and* has the `admin` role in `user_plans`. */
export async function requireAdmin(accessToken?: string | null): Promise<Owner> {
  const owner = await resolveOwner(accessToken);
  const db = await admin();
  const { data } = await db
    .from("user_plans")
    .select("role")
    .eq("user_id", owner.userId)
    .maybeSingle();
  if (data?.role !== "admin") throw new Error("Forbidden: admin access required.");
  // Blanket cap across every admin action — every one of them calls requireAdmin first.
  const { rateLimit } = await import("./rate-limit.server");
  await rateLimit(`admin:${owner.userId}`, 120, 60);
  return owner;
}

export async function logAudit(
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const db = await admin();
  await db.from("audit_log").insert({
    actor_user_id: actorUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata as Json,
  });
}

export async function amIAdmin(accessToken?: string | null): Promise<boolean> {
  try {
    await requireAdmin(accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function getAdminStats(accessToken?: string | null) {
  await requireAdmin(accessToken);
  const db = await admin();
  const nowIso = new Date().toISOString();

  const [
    { data: authUsers },
    { count: proUsers },
    { count: totalFiles },
    { data: platformFiles },
    { count: totalPayments },
    { data: revenueRows },
    { count: pendingPayments },
    { count: failedPayments },
  ] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("user_plans").select("user_id", { count: "exact", head: true }).eq("plan", "pro"),
    db.from("files").select("id", { count: "exact", head: true }),
    db
      .from("files")
      .select("size, storage_nodes!inner(is_platform_node)")
      .eq("storage_nodes.is_platform_node", true)
      .or(`is_permanent.eq.true,expires_at.gt.${nowIso}`),
    db.from("payments").select("id", { count: "exact", head: true }),
    db.from("payments").select("amount_cents").eq("status", "succeeded"),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  // Free users have no user_plans row until they interact with plan-aware features — count them
  // via the auth user list, not user_plans, so newly-signed-up free users aren't missed.
  const totalUsersCount = authUsers?.users?.length ?? 0;
  const proUsersCount = proUsers ?? 0;
  const platformStorageUsedBytes = (platformFiles ?? []).reduce(
    (sum, row) => sum + Number(row.size),
    0,
  );
  const revenueCents = (revenueRows ?? []).reduce((sum, row) => sum + Number(row.amount_cents), 0);

  return {
    totalUsers: totalUsersCount,
    freeUsers: Math.max(0, totalUsersCount - proUsersCount),
    proUsers: proUsersCount,
    platformStorageUsedBytes,
    totalFiles: totalFiles ?? 0,
    totalPayments: totalPayments ?? 0,
    revenueCents,
    pendingPayments: pendingPayments ?? 0,
    failedPayments: failedPayments ?? 0,
  };
}

export type AdminUserRow = {
  userId: string;
  email: string | null;
  plan: string;
  role: string;
  source: string;
  status: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
  lifetimeUploads: number;
  createdAt: string | null;
};

export async function listUsers(
  accessToken?: string | null,
  search?: string | null,
): Promise<AdminUserRow[]> {
  await requireAdmin(accessToken);
  const db = await admin();

  const [{ data: plans }, { data: authUsers }] = await Promise.all([
    db
      .from("user_plans")
      .select(
        "user_id, plan, role, source, status, expires_at, subscription_id, lifetime_platform_uploads",
      ),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const planByUser = new Map((plans ?? []).map((p) => [p.user_id, p]));
  const q = search?.trim().toLowerCase();

  return (authUsers?.users ?? [])
    .filter((u) => !q || (u.email ?? "").toLowerCase().includes(q))
    .map((u) => {
      const plan = planByUser.get(u.id);
      return {
        userId: u.id,
        email: u.email ?? null,
        plan: plan?.plan ?? "free",
        role: plan?.role ?? "user",
        source: plan?.source ?? "default",
        status: plan?.status ?? null,
        expiresAt: plan?.expires_at ?? null,
        subscriptionId: plan?.subscription_id ?? null,
        lifetimeUploads: plan?.lifetime_platform_uploads ?? 0,
        createdAt: u.created_at ?? null,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export type AdminUserBillingDetail = {
  subscription: {
    id: string;
    provider: string;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    status: string;
    plan: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  payments: {
    id: string;
    provider: string;
    providerPaymentId: string | null;
    providerOrderId: string | null;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
};

export async function getUserBillingDetail(
  targetUserId: string,
  accessToken?: string | null,
): Promise<AdminUserBillingDetail> {
  await requireAdmin(accessToken);
  const { getCurrentSubscription, listPaymentsForUser } =
    await import("./billing/subscription.service");
  const [subscription, payments] = await Promise.all([
    getCurrentSubscription(targetUserId),
    listPaymentsForUser(targetUserId, 10),
  ]);

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          provider: subscription.provider,
          providerCustomerId: subscription.provider_customer_id,
          providerSubscriptionId: subscription.provider_subscription_id,
          status: subscription.status,
          plan: subscription.plan,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      providerPaymentId: p.provider_payment_id,
      providerOrderId: p.provider_order_id,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
    })),
  };
}

/** Manual override from the admin panel — always source='manual', never a fabricated payment. */
export async function setUserPlan(
  targetUserId: string,
  plan: "free" | "pro",
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  const { activatePro, downgradeToFree } = await import("./billing/billing.service");
  if (plan === "pro") await activatePro({ userId: targetUserId, source: "manual" });
  else await downgradeToFree(targetUserId, "manual");
  await logAudit(owner.userId, "set_user_plan", "user", targetUserId, { plan, source: "manual" });
  return { ok: true };
}

export async function setUserRole(
  targetUserId: string,
  role: "user" | "admin",
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  if (targetUserId === owner.userId && role === "user") {
    throw new Error("You can't remove your own admin access.");
  }
  const db = await admin();
  const { error } = await db
    .from("user_plans")
    .upsert({ user_id: targetUserId, role, updated_at: new Date().toISOString() });
  if (error) safeDbError(error, "admin");
  await logAudit(owner.userId, "set_user_role", "user", targetUserId, { role });
  return { ok: true };
}

export type AdminPaymentRow = {
  id: string;
  userId: string;
  email: string | null;
  provider: string;
  amountCents: number;
  currency: string;
  status: string;
  plan: string;
  createdAt: string;
};

export async function listPayments(
  accessToken?: string | null,
  page = 1,
  pageSize = 25,
): Promise<{ rows: AdminPaymentRow[]; total: number }> {
  await requireAdmin(accessToken);
  const db = await admin();
  const from = (page - 1) * pageSize;

  const [{ data, count, error }, { data: authUsers }] = await Promise.all([
    db
      .from("payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (error) safeDbError(error, "admin");

  const emailByUser = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? null]));

  return {
    rows: (data ?? []).map((p) => ({
      id: p.id,
      userId: p.user_id,
      email: emailByUser.get(p.user_id) ?? null,
      provider: p.provider,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      plan: p.plan,
      createdAt: p.created_at,
    })),
    total: count ?? 0,
  };
}

export type AdminAuditRow = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function listAuditLog(
  accessToken?: string | null,
  page = 1,
  pageSize = 25,
): Promise<{ rows: AdminAuditRow[]; total: number }> {
  await requireAdmin(accessToken);
  const db = await admin();
  const from = (page - 1) * pageSize;

  const [{ data, count, error }, { data: authUsers }] = await Promise.all([
    db
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (error) safeDbError(error, "admin");

  const emailByUser = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? null]));

  return {
    rows: (data ?? []).map((a) => ({
      id: a.id,
      actorUserId: a.actor_user_id,
      actorEmail: a.actor_user_id ? (emailByUser.get(a.actor_user_id) ?? null) : null,
      action: a.action,
      targetType: a.target_type,
      targetId: a.target_id,
      metadata: (a.metadata ?? {}) as Record<string, unknown>,
      createdAt: a.created_at,
    })),
    total: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Admin-only tooling for exercising the full billing lifecycle (activation,
// renewal, past due, recovery, cancellation, expiry) without a real charge.
// ---------------------------------------------------------------------------

export type MockPlanId = "pro_monthly" | "pro_yearly";

export async function adminMockSubscribe(
  targetUserId: string,
  planId: MockPlanId,
  accessToken?: string | null,
): Promise<{ subscriptionId: string }> {
  const owner = await requireAdmin(accessToken);
  const { mockSubscribe } = await import("./billing/mock-events");
  const subscriptionId = await mockSubscribe(targetUserId, planId);
  await logAudit(owner.userId, "mock_subscribe", "subscription", subscriptionId, {
    targetUserId,
    planId,
  });
  return { subscriptionId };
}

export async function adminMockRenew(
  subscriptionId: string,
  planId: MockPlanId,
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  const { mockRenew } = await import("./billing/mock-events");
  await mockRenew(subscriptionId, planId);
  await logAudit(owner.userId, "mock_renew", "subscription", subscriptionId, { planId });
  return { ok: true };
}

export async function adminMockPaymentFailure(
  subscriptionId: string,
  planId: MockPlanId,
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  const { mockPaymentFailure } = await import("./billing/mock-events");
  await mockPaymentFailure(subscriptionId, planId);
  await logAudit(owner.userId, "mock_payment_failure", "subscription", subscriptionId, { planId });
  return { ok: true };
}

export async function adminMockRecoverPayment(
  subscriptionId: string,
  planId: MockPlanId,
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  const { mockRecoverPayment } = await import("./billing/mock-events");
  await mockRecoverPayment(subscriptionId, planId);
  await logAudit(owner.userId, "mock_recover_payment", "subscription", subscriptionId, { planId });
  return { ok: true };
}

export async function adminMockCancel(
  subscriptionId: string,
  atPeriodEnd: boolean,
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  const { mockCancel } = await import("./billing/mock-events");
  await mockCancel(subscriptionId, atPeriodEnd);
  await logAudit(owner.userId, "mock_cancel", "subscription", subscriptionId, { atPeriodEnd });
  return { ok: true };
}

export async function adminMockExpire(
  subscriptionId: string,
  accessToken?: string | null,
): Promise<{ ok: true }> {
  const owner = await requireAdmin(accessToken);
  const { mockExpire } = await import("./billing/mock-events");
  await mockExpire(subscriptionId);
  await logAudit(owner.userId, "mock_expire", "subscription", subscriptionId, {});
  return { ok: true };
}
