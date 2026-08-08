"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/billing-config";
import {
  listUsersAction,
  setUserPlanAction,
  setUserRoleAction,
  getUserBillingDetailAction,
  adminMockSubscribeAction,
  adminMockRenewAction,
  adminMockPaymentFailureAction,
  adminMockRecoverPaymentAction,
  adminMockCancelAction,
  adminMockExpireAction,
} from "@/app/actions/admin";

const SOURCE_LABELS: Record<string, string> = {
  default: "Default",
  subscription: "Subscription",
  manual: "Manual",
  dev: "Dev",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [billingUserId, setBillingUserId] = useState<string | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-users", user?.id, search],
    enabled: !!user,
    queryFn: async () => listUsersAction(await withAuth({ search })),
  });

  const setPlan = useMutation({
    mutationFn: async (v: { userId: string; plan: "free" | "pro" }) =>
      setUserPlanAction(await withAuth({ ...v })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Plan updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async (v: { userId: string; role: "user" | "admin" }) =>
      setUserRoleAction(await withAuth({ ...v })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const billingUser = query.data?.find((u) => u.userId === billingUserId) ?? null;

  return (
    <div>
      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email"
          className="h-8 pl-8"
        />
      </div>

      <div className="panel mt-4 overflow-hidden">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !query.data?.length ? (
          <div className="px-6 py-20 text-center text-sm text-muted-foreground">No users</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Lifetime uploads</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell className="text-sm font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        u.plan === "pro"
                          ? "rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground"
                          : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      }
                    >
                      {u.plan}
                      {u.status && u.status !== "active" ? ` · ${u.status}` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {SOURCE_LABELS[u.source] ?? u.source}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {u.expiresAt ? formatDate(u.expiresAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {u.role === "admin" ? (
                        <ShieldCheck className="size-3.5 text-primary" />
                      ) : (
                        <UserIcon className="size-3.5" />
                      )}
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lifetimeUploads}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {u.createdAt ? formatDate(u.createdAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setBillingUserId(u.userId)}>
                          View billing
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Plan</DropdownMenuLabel>
                        <DropdownMenuItem
                          disabled={u.plan === "free"}
                          onClick={() => setPlan.mutate({ userId: u.userId, plan: "free" })}
                        >
                          Set to Free
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={u.plan === "pro"}
                          onClick={() => setPlan.mutate({ userId: u.userId, plan: "pro" })}
                        >
                          Set to Pro
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Role</DropdownMenuLabel>
                        <DropdownMenuItem
                          disabled={u.role === "user"}
                          onClick={() => setRole.mutate({ userId: u.userId, role: "user" })}
                        >
                          Set to User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={u.role === "admin"}
                          onClick={() => setRole.mutate({ userId: u.userId, role: "admin" })}
                        >
                          Set to Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!billingUserId} onOpenChange={(open) => !open && setBillingUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Billing — {billingUser?.email ?? "user"}</DialogTitle>
            <DialogDescription>
              Subscription, payment history, and internal lifecycle tools.
            </DialogDescription>
          </DialogHeader>
          {billingUserId && <BillingDetail userId={billingUserId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MOCK_PLAN_OPTIONS = [
  { id: "pro_monthly" as const, label: "Pro Monthly" },
  { id: "pro_yearly" as const, label: "Pro Yearly" },
];

function BillingDetail({ userId }: { userId: string }) {
  const [planId, setPlanId] = useState<"pro_monthly" | "pro_yearly">("pro_monthly");
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["admin-user-billing", userId],
    queryFn: async () => getUserBillingDetailAction(await withAuth({ userId })),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-user-billing", userId] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const subscribe = useMutation({
    mutationFn: async () => adminMockSubscribeAction(await withAuth({ userId, planId })),
    onSuccess: () => {
      invalidate();
      toast.success("Mock subscription activated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const subscriptionId = detail.data?.subscription?.id;

  const renew = useMutation({
    mutationFn: async () =>
      adminMockRenewAction(await withAuth({ subscriptionId: subscriptionId!, planId })),
    onSuccess: () => {
      invalidate();
      toast.success("Mock renewal recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paymentFailure = useMutation({
    mutationFn: async () =>
      adminMockPaymentFailureAction(await withAuth({ subscriptionId: subscriptionId!, planId })),
    onSuccess: () => {
      invalidate();
      toast.success("Marked past due");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recover = useMutation({
    mutationFn: async () =>
      adminMockRecoverPaymentAction(await withAuth({ subscriptionId: subscriptionId!, planId })),
    onSuccess: () => {
      invalidate();
      toast.success("Recovered to active");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (atPeriodEnd: boolean) =>
      adminMockCancelAction(await withAuth({ subscriptionId: subscriptionId!, atPeriodEnd })),
    onSuccess: () => {
      invalidate();
      toast.success("Subscription cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expire = useMutation({
    mutationFn: async () =>
      adminMockExpireAction(await withAuth({ subscriptionId: subscriptionId! })),
    onSuccess: () => {
      invalidate();
      toast.success("Subscription expired");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const sub = detail.data?.subscription ?? null;

  return (
    <div className="space-y-5">
      <div>
        <div className="label-caps">Subscription</div>
        {sub ? (
          <div className="mt-2 rounded-lg border border-border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{sub.plan}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {sub.status}
                {sub.cancelAtPeriodEnd ? " · cancels at period end" : ""}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {sub.currentPeriodStart ? formatDate(sub.currentPeriodStart) : "—"} →{" "}
              {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Provider: {sub.provider}</p>
            {sub.providerCustomerId && (
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                Customer ID: {sub.providerCustomerId}
              </p>
            )}
            {sub.providerSubscriptionId && (
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                Subscription ID: {sub.providerSubscriptionId}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No subscription yet.</p>
        )}
      </div>

      <div>
        <div className="label-caps">Payment history</div>
        {detail.data?.payments.length ? (
          <ul className="mt-2 space-y-1.5">
            {detail.data.payments.map((p) => (
              <li key={p.id} className="rounded-md border border-border px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>
                    {formatMoney(p.amountCents, p.currency)} · {p.provider}
                  </span>
                  <span className="text-muted-foreground">
                    {p.status} · {formatDate(p.createdAt)}
                  </span>
                </div>
                {(p.providerOrderId || p.providerPaymentId) && (
                  <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {p.providerOrderId ? `order: ${p.providerOrderId}` : ""}
                    {p.providerOrderId && p.providerPaymentId ? " · " : ""}
                    {p.providerPaymentId ? `payment: ${p.providerPaymentId}` : ""}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
        )}
      </div>

      <div>
        <div className="label-caps">Internal lifecycle tools</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {MOCK_PLAN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPlanId(opt.id)}
              className={
                planId === opt.id
                  ? "rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                  : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!sub} onClick={() => subscribe.mutate()}>
            Mock subscribe
          </Button>
          <Button size="sm" variant="outline" disabled={!sub} onClick={() => renew.mutate()}>
            Mock renew
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!sub}
            onClick={() => paymentFailure.mutate()}
          >
            Mock payment failure
          </Button>
          <Button size="sm" variant="outline" disabled={!sub} onClick={() => recover.mutate()}>
            Mock recover
          </Button>
          <Button size="sm" variant="outline" disabled={!sub} onClick={() => cancel.mutate(true)}>
            Cancel at period end
          </Button>
          <Button size="sm" variant="outline" disabled={!sub} onClick={() => cancel.mutate(false)}>
            Cancel now
          </Button>
          <Button size="sm" variant="outline" disabled={!sub} onClick={() => expire.mutate()}>
            Mock expire
          </Button>
        </div>
      </div>
    </div>
  );
}
