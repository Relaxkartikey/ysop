"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget: "_self" | "_blank" | "_top";
      }) => void;
    };
  }
}

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

/**
 * Bridge page: Cashfree's Orders API has no plain hosted-checkout URL, only a
 * `payment_session_id` that must be handed to their JS SDK client-side. This page
 * exists solely to load that SDK and hand off — no billing decisions happen here.
 */
export default function CashfreeCheckoutBridge() {
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
      <CashfreeCheckoutBridgeInner />
    </Suspense>
  );
}

function CashfreeCheckoutBridgeInner() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      const mode =
        process.env["NEXT_PUBLIC_CASHFREE_MODE"] === "production" ? "production" : "sandbox";
      if (!window.Cashfree) {
        setError("Couldn't load the payment SDK.");
        return;
      }
      const cashfree = window.Cashfree({ mode });
      cashfree.checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
    };
    script.onerror = () => setError("Couldn't load the payment SDK.");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-center text-muted-foreground">
        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Opening secure checkout…</p>
          </>
        )}
      </div>
    </div>
  );
}
