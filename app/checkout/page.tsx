"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import { BILLING_PLANS, formatMoney } from "@/lib/billing-config";
import { createCheckoutAction } from "@/app/actions/billing";
import { cn } from "@/lib/utils";

const PLAN_OPTIONS = [BILLING_PLANS.pro_monthly, BILLING_PLANS.pro_yearly];

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [planId, setPlanId] = useState<"pro_monthly" | "pro_yearly">("pro_monthly");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startCheckout = async () => {
    if (!phone.trim()) {
      toast.error("Enter a phone number — Cashfree requires it for checkout.");
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await createCheckoutAction(
        await withAuth({
          planId,
          customerPhone: phone.trim(),
          origin: window.location.origin,
        }),
      );
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start checkout");
      setSubmitting(false);
    }
  };

  if (!loading && !user) {
    router.replace("/auth");
    return null;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-16">
        <div className="label-caps">Upgrade</div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Go Pro</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring your own Cloudflare R2 storage, permanent links, and full storage management.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {PLAN_OPTIONS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlanId(plan.id)}
              className={cn(
                "panel rounded-2xl p-5 text-left transition-colors",
                planId === plan.id
                  ? "border-primary ring-1 ring-primary"
                  : "hover:border-primary/40",
              )}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {plan.interval === "monthly" ? "Monthly" : "Yearly"}
              </div>
              <div className="mt-1.5 text-2xl font-semibold tracking-tight">
                {formatMoney(plan.amount, plan.currency)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {plan.interval === "monthly" ? "mo" : "yr"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone number
          </label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Required by Cashfree for checkout"
            className="mt-1.5"
          />
        </div>

        <Button className="mt-6 w-full" size="lg" disabled={submitting} onClick={startCheckout}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Continue to payment"}
        </Button>
      </main>
    </div>
  );
}
