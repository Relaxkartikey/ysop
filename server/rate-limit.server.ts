async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Atomic fixed-window rate limit, backed by `rate_limit_check()` in Postgres so it's
 * correct across every serverless instance. `key` should already be scoped to the
 * action (e.g. `upload:${userId}`) — this function does no scoping itself.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const db = await admin();
  const { data, error } = await db.rpc("rate_limit_check", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open: a transient DB hiccup on this non-critical path shouldn't block the
    // underlying action (upload, checkout, ...) entirely.
    console.error("[rate-limit] check failed, allowing request:", error.message);
    return;
  }
  if (!data) throw new Error("Too many requests. Please slow down and try again shortly.");
}
