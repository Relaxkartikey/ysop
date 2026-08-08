"use server";

import { z } from "zod";
import {
  amIAdmin,
  getAdminStats,
  listUsers,
  setUserPlan,
  setUserRole,
  listPayments,
  listAuditLog,
  getUserBillingDetail,
  adminMockSubscribe,
  adminMockRenew,
  adminMockPaymentFailure,
  adminMockRecoverPayment,
  adminMockCancel,
  adminMockExpire,
} from "@/server/admin.server";

const token = z.string().nullish();
const mockPlanId = z.enum(["pro_monthly", "pro_yearly"]);

export async function amIAdminAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  return amIAdmin(data.accessToken);
}

export async function getAdminStatsAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  return getAdminStats(data.accessToken);
}

export async function listUsersAction(input: unknown) {
  const data = z.object({ accessToken: token, search: z.string().nullish() }).parse(input);
  return listUsers(data.accessToken, data.search);
}

export async function setUserPlanAction(input: unknown) {
  const data = z
    .object({ userId: z.string().uuid(), plan: z.enum(["free", "pro"]), accessToken: token })
    .parse(input);
  return setUserPlan(data.userId, data.plan, data.accessToken);
}

export async function setUserRoleAction(input: unknown) {
  const data = z
    .object({ userId: z.string().uuid(), role: z.enum(["user", "admin"]), accessToken: token })
    .parse(input);
  return setUserRole(data.userId, data.role, data.accessToken);
}

export async function listPaymentsAction(input: unknown) {
  const data = z
    .object({
      accessToken: token,
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().positive().max(100).optional(),
    })
    .parse(input);
  return listPayments(data.accessToken, data.page, data.pageSize);
}

export async function listAuditLogAction(input: unknown) {
  const data = z
    .object({
      accessToken: token,
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().positive().max(100).optional(),
    })
    .parse(input);
  return listAuditLog(data.accessToken, data.page, data.pageSize);
}

export async function getUserBillingDetailAction(input: unknown) {
  const data = z.object({ userId: z.string().uuid(), accessToken: token }).parse(input);
  return getUserBillingDetail(data.userId, data.accessToken);
}

export async function adminMockSubscribeAction(input: unknown) {
  const data = z
    .object({ userId: z.string().uuid(), planId: mockPlanId, accessToken: token })
    .parse(input);
  return adminMockSubscribe(data.userId, data.planId, data.accessToken);
}

export async function adminMockRenewAction(input: unknown) {
  const data = z
    .object({ subscriptionId: z.string().uuid(), planId: mockPlanId, accessToken: token })
    .parse(input);
  return adminMockRenew(data.subscriptionId, data.planId, data.accessToken);
}

export async function adminMockPaymentFailureAction(input: unknown) {
  const data = z
    .object({ subscriptionId: z.string().uuid(), planId: mockPlanId, accessToken: token })
    .parse(input);
  return adminMockPaymentFailure(data.subscriptionId, data.planId, data.accessToken);
}

export async function adminMockRecoverPaymentAction(input: unknown) {
  const data = z
    .object({ subscriptionId: z.string().uuid(), planId: mockPlanId, accessToken: token })
    .parse(input);
  return adminMockRecoverPayment(data.subscriptionId, data.planId, data.accessToken);
}

export async function adminMockCancelAction(input: unknown) {
  const data = z
    .object({
      subscriptionId: z.string().uuid(),
      atPeriodEnd: z.boolean(),
      accessToken: token,
    })
    .parse(input);
  return adminMockCancel(data.subscriptionId, data.atPeriodEnd, data.accessToken);
}

export async function adminMockExpireAction(input: unknown) {
  const data = z.object({ subscriptionId: z.string().uuid(), accessToken: token }).parse(input);
  return adminMockExpire(data.subscriptionId, data.accessToken);
}
