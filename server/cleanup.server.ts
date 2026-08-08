import { resolveStorage } from "./storage/manager.server";
import { safeDbError } from "./safe-error.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const BATCH_SIZE = 200;

/**
 * Deletes expired (non-permanent, past `expires_at`) files: removes the storage object
 * first, then the DB row — never the reverse, so a storage failure leaves the file
 * queryable and retried next run instead of orphaning the object. Permanent files
 * (`is_permanent = true`) are excluded by the query itself, not just by convention.
 * Safe to run repeatedly/concurrently: each file is only ever touched once since the
 * DB delete is what removes it from the next run's query.
 */
export async function cleanupExpiredFiles(): Promise<{
  scanned: number;
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const db = await admin();
  const nowIso = new Date().toISOString();

  const { data: expired, error } = await db
    .from("files")
    .select("id, storage_key, storage_node_id")
    .eq("is_permanent", false)
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso)
    .limit(BATCH_SIZE);
  if (error) safeDbError(error, "cleanup");

  const rows = expired ?? [];
  let deleted = 0;
  const errors: string[] = [];

  for (const file of rows) {
    try {
      const { provider } = await resolveStorage(file.storage_node_id);
      await provider.remove([file.storage_key]);
      const { error: deleteError } = await db.from("files").delete().eq("id", file.id);
      if (deleteError) safeDbError(deleteError, "cleanup");
      deleted += 1;
    } catch (err) {
      errors.push(`${file.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { scanned: rows.length, deleted, failed: rows.length - deleted, errors };
}
