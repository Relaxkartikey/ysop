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
import { listAuditLogAction } from "@/app/actions/admin";

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-audit", user?.id, page],
    enabled: !!user,
    queryFn: async () => listAuditLogAction(await withAuth({ page, pageSize: PAGE_SIZE })),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="panel overflow-hidden">
      {query.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !query.data?.rows.length ? (
        <div className="px-6 py-20 text-center text-sm text-muted-foreground">
          No admin actions recorded yet
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm font-medium">
                    {a.actorEmail ?? a.actorUserId ?? "system"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.targetType}
                    {a.targetId ? ` · ${a.targetId.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate font-mono text-xs text-muted-foreground">
                    {JSON.stringify(a.metadata)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(a.createdAt)}
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
