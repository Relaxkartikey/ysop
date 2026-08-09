"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClaimProDialog } from "@/components/claim-pro-dialog";
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import { formatMoney } from "@/lib/billing-config";
import { getSubscriptionDetailsAction, cancelProAction } from "@/app/actions/billing";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SubscriptionDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const details = useQuery({
    queryKey: ["subscription-details", user?.id],
    enabled: open && !loading && !!user,
    queryFn: async () => getSubscriptionDetailsAction(await withAuth({})),
  });

  const cancel = useMutation({
    mutationFn: async () => cancelProAction(await withAuth({})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      qc.invalidateQueries({ queryKey: ["subscription-details"] });
      setOpen(false);
      toast.success("Subscription canceled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPro = details.data?.plan === "pro";
  const subscription = details.data?.subscription ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
            <CreditCard className="size-5" />
          </div>
          <DialogTitle className="text-center">Subscription</DialogTitle>
          <DialogDescription className="text-center">
            {isPro
              ? "You're on Pro. Manage your subscription below."
              : "Manage your YSOP Pro subscription."}
          </DialogDescription>
        </DialogHeader>

        {isPro && subscription && (
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Since</span>
              <span className="font-medium">{formatDate(subscription.since)}</span>
            </div>
            {subscription.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? "Active until" : "Renews / expires"}
                </span>
                <span className="font-medium">{formatDate(subscription.expiresAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-medium">
                {subscription.amountCents !== null && subscription.currency
                  ? formatMoney(subscription.amountCents, subscription.currency)
                  : "—"}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="sm:flex-col sm:space-x-0 sm:space-y-2">
          {isPro ? (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? "Canceling…" : "Cancel subscription"}
            </Button>
          ) : (
            <ClaimProDialog>
              <Button className="w-full">Go Pro (Claim Free)</Button>
            </ClaimProDialog>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
