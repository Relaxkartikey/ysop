import type { StorageProvider, StorageProviderId } from "./storage.interface";
import {
  createR2StorageProvider,
  platformR2Credentials,
  type R2Credentials,
} from "./r2.storage.server";
import { decryptCredentials } from "./crypto.server";
import { safeDbError } from "../safe-error.server";

/**
 * Provider factory registry: one entry per implemented StorageProviderId.
 * Adding a new provider (Cloudinary, S3, local) means writing one
 * *.storage.server.ts file and adding it here — nothing else in the app changes.
 * Factories take the node so bucket-per-node providers (R2, S3) can point at
 * the right bucket, and personal (BYOS) nodes decrypt their own credentials.
 */
const providerFactories: Partial<
  Record<StorageProviderId, (node: StorageNode) => StorageProvider>
> = {
  r2: (node) => {
    if (!node.bucket) throw new Error(`Storage node "${node.name}" is missing a bucket`);
    const creds = node.is_platform_node
      ? platformR2Credentials()
      : decryptCredentials<R2Credentials>(node.credentials!);
    return createR2StorageProvider(creds, node.bucket, node.public_base_url);
  },
};

export type StorageNode = {
  id: string;
  name: string;
  display_name: string | null;
  provider: StorageProviderId;
  bucket: string | null;
  region: string | null;
  public_base_url: string | null;
  enabled: boolean;
  is_default: boolean;
  is_platform_node: boolean;
  owner_user_id: string | null;
  credentials: string | null;
  quota: number | null;
  priority: number;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Storage Manager: the only place that knows storage_nodes exist and how to
 * pick one. Business logic (files.server.ts) asks for a node id (or nothing,
 * for the default) and gets back a ready-to-use provider — it never queries
 * storage_nodes or picks a provider itself.
 *
 * Selection: an explicit node id wins (validated against `ownerId` when one
 * is supplied — platform nodes are always allowed, personal nodes only for
 * their owner); otherwise falls back to the platform default node.
 */
export async function resolveStorage(
  nodeId?: string | null,
  ownerId?: string | null,
): Promise<{ node: StorageNode; provider: StorageProvider }> {
  const node = await pickNode(nodeId, ownerId);
  const factory = providerFactories[node.provider];
  if (!factory) throw new Error(`Storage provider "${node.provider}" is not implemented`);
  return { node, provider: factory(node) };
}

async function pickNode(nodeId?: string | null, ownerId?: string | null): Promise<StorageNode> {
  const db = await admin();
  const query = db.from("storage_nodes").select("*").eq("enabled", true);
  const { data, error } = nodeId
    ? await query.eq("id", nodeId).maybeSingle()
    : await query
        .eq("is_default", true)
        .order("priority", { ascending: true })
        .limit(1)
        .maybeSingle();
  if (error) safeDbError(error, "manager");
  if (!data) {
    throw new Error(
      nodeId
        ? `Storage node "${nodeId}" not found or disabled`
        : "No default storage node configured",
    );
  }
  const node = data as StorageNode;
  if (nodeId && ownerId !== undefined && !node.is_platform_node && node.owner_user_id !== ownerId) {
    throw new Error("You don't have access to that storage node.");
  }
  return node;
}
