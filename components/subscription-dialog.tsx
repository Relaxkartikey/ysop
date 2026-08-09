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
import { getUsageAction } from "@/app/actions/files";
import { cancelProAction } from "@/app/actions/billing";

export function SubscriptionDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const usage = useQuery({
    queryKey: ["usage", user?.id],
    enabled: open && !loading && !!user,
    queryFn: async () => getUsageAction(await withAuth({})),
  });

  const cancel = useMutation({
    mutationFn: async () => cancelProAction(await withAuth({})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      setOpen(false);
      toast.success("Subscription canceled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPro = usage.data?.capabilities.canByos === true;

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
