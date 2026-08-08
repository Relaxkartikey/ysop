"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/billing-config";
import { listPaymentsAction } from "@/app/actions/admin";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-success-soft text-accent-foreground",
  pending: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 25;

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-payments", user?.id, page],
    enabled: !!user,
    queryFn: async () => listPaymentsAction(await withAuth({ page, pageSize: PAGE_SIZE })),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="panel overflow-hidden">
      {query.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !query.data?.rows.length ? (
        <div className="px-6 py-20 text-center">
          <p className="text-sm font-medium">No payments yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Rows will appear here once a payment provider is wired up — this table is
            provider-agnostic and ready for that integration.
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium">{p.email ?? p.userId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.provider}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.plan}</TableCell>
                  <TableCell className="text-sm">
                    {formatMoney(p.amountCents, p.currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[p.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
