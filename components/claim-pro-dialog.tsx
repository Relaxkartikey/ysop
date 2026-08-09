"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import { claimFreeTrialAction } from "@/app/actions/billing";

const CLAIM_PERKS = ["Cloudflare R2 via YSOP", "Permanent links", "Personal storage management"];

export function ClaimProDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const claim = useMutation({
    mutationFn: async () => claimFreeTrialAction(await withAuth({})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      setOpen(false);
      toast.success("Pro claimed — enjoy 3 months on us!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClaim = () => {
    if (!user) {
      setOpen(false);
      toast.error("Sign in first to claim Pro.");
      return;
    }
    claim.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="text-center">Claim Pro — free for 3 months</DialogTitle>
          <DialogDescription className="text-center">
            No card required. Claim your account now and get 3 months of Pro on us.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {CLAIM_PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-sm">
              <Check className="size-4 shrink-0 text-primary" />
              {perk}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Not now
          </Button>
          <Button onClick={handleClaim} disabled={claim.isPending}>
            {claim.isPending ? "Claiming…" : "Claim 3 months free"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
