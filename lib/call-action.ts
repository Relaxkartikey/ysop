import { supabase } from "@/integrations/supabase/client";

/** Attaches the current Supabase access token to a Server Action payload, mirroring the old client-side auth middleware. */
export async function withAuth<T extends Record<string, unknown>>(data: T) {
  const { data: sessionData } = await supabase.auth.getSession();
  return { ...data, accessToken: sessionData.session?.access_token ?? null };
}
