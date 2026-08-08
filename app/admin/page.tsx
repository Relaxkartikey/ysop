"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  Crown,
  HardDrive,
  FileText,
  Receipt,
  DollarSign,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import { formatBytes } from "@/lib/format";
import { formatMoney } from "@/lib/billing-config";
import { getAdminStatsAction } from "@/app/actions/admin";

const CARDS = [
  {
    key: "totalUsers",
    label: "Total users",
    icon: Users,
    format: (v: number) => v.toLocaleString(),
  },
  { key: "freeUsers", label: "Free users", icon: Users, format: (v: number) => v.toLocaleString() },
  { key: "proUsers", label: "Pro users", icon: Crown, format: (v: number) => v.toLocaleString() },
  {
    key: "platformStorageUsedBytes",
    label: "Platform storage used",
    icon: HardDrive,
    format: (v: number) => formatBytes(v),
  },
  {
    key: "totalFiles",
    label: "Total files",
    icon: FileText,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "totalPayments",
    label: "Total payments",
    icon: Receipt,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "revenueCents",
    label: "Revenue",
    icon: DollarSign,
    format: (v: number) => formatMoney(v, "inr"),
  },
  {
    key: "pendingPayments",
    label: "Pending payments",
    icon: Clock,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "failedPayments",
    label: "Failed payments",
    icon: XCircle,
    format: (v: number) => v.toLocaleString(),
  },
] as const;

export default function AdminDashboard() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-stats", user?.id],
    enabled: !!user,
    queryFn: async () => getAdminStatsAction(await withAuth({})),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load stats.</p>;
  }

  const stats = query.data;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((card) => (
        <div key={card.key} className="panel flex items-center gap-4 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-primary">
            <card.icon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.label}
            </div>
            <div className="mt-0.5 text-xl font-semibold tracking-tight">
              {card.format(stats[card.key])}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
