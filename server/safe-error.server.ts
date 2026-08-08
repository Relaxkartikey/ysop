/**
 * Raw Postgres/provider error messages (constraint names, column names, internal
 * shapes) must never reach the browser — Next.js forwards a thrown Error's `.message`
 * from a Server Action to the client verbatim, in both dev and prod. Call this at every
 * `if (error) ...` after a Supabase/provider call instead of throwing `error.message`
 * directly. The original error is still logged server-side for debugging.
 */
export function safeDbError(error: { message: string }, context: string): never {
  console.error(`[db:${context}]`, error.message);
  throw new Error("Something went wrong. Please try again.");
}
