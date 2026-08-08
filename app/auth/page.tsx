"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setBusy(false);
      toast.error("Could not sign in with Google. Please try again.");
    }
    // On success the browser is redirected to Google, so nothing else to do here.
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-5 py-24">
        <div className="panel w-full p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to YSOP</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A free Google account is all you need — keep up to 40 active uploads, manage them from
            any device, and get a persistent dashboard until each file expires.
          </p>
          <Button className="mt-7 w-full" size="lg" onClick={signIn} disabled={busy}>
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
        </div>
      </main>
    </div>
  );
}
