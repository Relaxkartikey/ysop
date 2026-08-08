"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { withAuth } from "@/lib/call-action";
import { getCheckoutStatusAction } from "@/app/actions/billing";

/**
 * Processing/result page after the Cashfree checkout redirect. Only ever *reports*
 * status — Pro is activated exclusively by the verified webhook, never from this page,
 * so a user who closes the tab or reloads here can't spoof entitlement.
 */
export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <SiteHeader />
          <div className="flex items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        </div>
      }
    >
      <CheckoutReturnInner />
    </Suspense>
  );
}

function CheckoutReturnInner() {
  const params = useSearchParams();
  const orderId = params.get("order_id");
  const [attempts, setAttempts] = useState(0);

  const query = useQuery({
    queryKey: ["checkout-status", orderId, attempts],
    enabled: !!orderId,
    queryFn: async () => getCheckoutStatusAction(await withAuth({ orderId })),
  });

  useEffect(() => {
    if (query.data?.paymentStatus === "pending" && attempts < 20) {
      const t = setTimeout(() => setAttempts((n) => n + 1), 3000);
      return () => clearTimeout(t);
    }
  }, [query.data?.paymentStatus, attempts]);

  const status = query.data?.paymentStatus;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-32 text-center">
        {!orderId || query.isLoading || status === "pending" ? (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Processing your payment</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This can take a few seconds — we&apos;re waiting for confirmation from Cashfree.
            </p>
          </>
        ) : status === "succeeded" ? (
          <>
            <CheckCircle2 className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Welcome to Pro</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment was confirmed and Pro is now active on your account.
            </p>
            <Button asChild className="mt-6">
              <Link href="/settings/storage">Go to Storage Settings</Link>
            </Button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto size-8 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              Payment didn&apos;t go through
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No charge was completed. You can try again anytime.
            </p>
            <Button asChild className="mt-6">
              <Link href="/checkout">Try again</Link>
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
