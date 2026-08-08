import { resolveStorage, type StorageNode } from "./storage/manager.server";
import { encryptCredentials } from "./storage/crypto.server";
import { testR2Connection, type R2Credentials } from "./storage/r2.storage.server";
import { PLANS, type Plan, type PlanId } from "@/lib/plans";
import { safeDbError } from "./safe-error.server";

/** Default cap for a newly connected personal storage node; the owner can raise or lower it later. */
export const DEFAULT_BYOS_QUOTA = 9 * 1024 * 1024 * 1024; // 9 GB

const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function makeSlug(length = 7): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

/** "Active" = permanent, or not yet expired. Used everywhere a file listing should include permanent files. */
function activeFilterExpr(nowIso: string): string {
  return `is_permanent.eq.true,expires_at.gt.${nowIso}`;
}

export function safeFilename(name: string): string {
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "file"
  );
}

export type Owner = { userId: string };

/** Verifies the Supabase access token. The app always operates on an authenticated user. */
export async function resolveOwner(accessToken?: string | null): Promise<Owner> {
  const token = accessToken && accessToken.split(".").length === 3 ? accessToken : null;
  if (!token) throw new Error("Sign in required.");

  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        return fetch(input, { ...init, headers: h });
      },
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const { data } = await client.auth.getClaims(token);
  if (!data?.claims?.sub) throw new Error("Sign in required.");
  return { userId: data.claims.sub as string };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Resolves the entitled plan for an owner, applying lazy expiry to a stale Pro row. */
export async function resolvePlanForOwner(owner: Owner): Promise<Plan> {
  const db = await admin();
  const { data } = await db
    .from("user_plans")
    .select("plan, status, expires_at")
    .eq("user_id", owner.userId)
    .maybeSingle();
  if (data?.plan !== "pro") return PLANS.free;

  // Lazy expiry: a Pro row past its `expires_at` (renewal missed, cancellation took effect)
  // reads as Free immediately, even before a background job flips the DB row to match.
  const isExpired =
    data.status === "active" && data.expires_at && new Date(data.expires_at) < new Date();
  return isExpired ? PLANS.free : PLANS.pro;
}

/** Internal testing toggle for staff accounts. Gated server-side; rejected if the flag isn't set. */
export async function setDevPlan(plan: PlanId, accessToken?: string | null) {
  if (process.env["NEXT_PUBLIC_ENABLE_DEV_PRO_SIMULATION"] !== "true") {
    throw new Error("Dev Pro simulation is disabled.");
  }
  const owner = await resolveOwner(accessToken);
  const { activatePro, downgradeToFree } = await import("./billing/billing.service");
  if (plan === "pro") await activatePro({ userId: owner.userId, source: "dev" });
  else await downgradeToFree(owner.userId, "dev");
  return { ok: true };
}

/**
 * Lifetime count of files ever uploaded to *platform* storage — never decrements on
 * delete/expiry. This is what caps free (and BYOS-less Pro) usage; connecting a
 * personal storage node sidesteps it entirely since those uploads aren't counted here.
 */
export async function getLifetimePlatformUploads(owner: Owner): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("user_plans")
    .select("lifetime_platform_uploads")
    .eq("user_id", owner.userId)
    .maybeSingle();
  return data?.lifetime_platform_uploads ?? 0;
}

async function incrementLifetimePlatformUploads(owner: Owner): Promise<void> {
  const db = await admin();
  const current = await getLifetimePlatformUploads(owner);
  const { error } = await db.from("user_plans").upsert({
    user_id: owner.userId,
    lifetime_platform_uploads: current + 1,
    updated_at: new Date().toISOString(),
  });
  if (error) safeDbError(error, "files");
}

/**
 * Sums active file bytes. `platformOnly` restricts the sum to files stored on
 * platform nodes — BYOS uploads live on the user's own bucket and don't count
 * against (or get capped by) the platform storage quota.
 */
export async function sumActiveBytes(owner: Owner, platformOnly = false): Promise<number> {
  const db = await admin();
  const nowExpr = activeFilterExpr(new Date().toISOString());

  if (platformOnly) {
    const { data } = await db
      .from("files")
      .select("size, storage_nodes!inner(is_platform_node)")
      .eq("user_id", owner.userId)
      .eq("storage_nodes.is_platform_node", true)
      .or(nowExpr);
    return (data ?? []).reduce((sum, row) => sum + Number(row.size), 0);
  }

  const { data } = await db.from("files").select("size").eq("user_id", owner.userId).or(nowExpr);
  return (data ?? []).reduce((sum, row) => sum + Number(row.size), 0);
}

/** Sum of active file bytes stored on a specific node (used for BYOS quota enforcement/display). */
export async function sumActiveBytesForNode(nodeId: string): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("files")
    .select("size")
    .eq("storage_node_id", nodeId)
    .or(activeFilterExpr(new Date().toISOString()));
  return (data ?? []).reduce((sum, row) => sum + Number(row.size), 0);
}

/** Shared by the upload page and dashboard: used/remaining/percentage against the owner's plan. */
export async function getUsageSummary(accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const plan = await resolvePlanForOwner(owner);
  const used = await sumActiveBytes(owner, true);
  const remaining = Math.max(0, plan.maxStorage - used);
  const percentage = plan.maxStorage > 0 ? Math.min(100, (used / plan.maxStorage) * 100) : 0;
  return {
    plan: plan.id,
    planLabel: plan.label,
    used,
    limit: plan.maxStorage,
    remaining,
    percentage,
    capabilities: {
      maxFileSize: plan.maxFileSize,
      maxActiveFiles: plan.maxActiveFiles,
      expiryOptions: plan.expiryOptions,
      canReplace: plan.canReplace,
      canFolders: plan.canFolders,
      canByos: plan.canByos,
      canPermanentLinks: plan.canPermanentLinks,
    },
  };
}

type PublicStorageNode = {
  id: string;
  displayName: string;
  provider: StorageNode["provider"];
  bucket: string | null;
  region: string | null;
  isPlatformNode: boolean;
  isDefault: boolean;
  quotaBytes: number | null;
  usedBytes: number | null;
};

function toPublicNode(node: StorageNode): Omit<PublicStorageNode, "usedBytes"> {
  return {
    id: node.id,
    displayName: node.display_name ?? node.name,
    provider: node.provider,
    bucket: node.bucket,
    region: node.region,
    isPlatformNode: node.is_platform_node,
    isDefault: node.is_default,
    quotaBytes: node.quota,
  };
}

/** Platform nodes + the caller's own personal nodes — never another user's, never credentials. */
export async function listStorageNodesForOwner(
  accessToken?: string | null,
): Promise<PublicStorageNode[]> {
  const owner = await resolveOwner(accessToken);
  const db = await admin();
  const { data, error } = await db
    .from("storage_nodes")
    .select("*")
    .eq("enabled", true)
    .or(`is_platform_node.eq.true,owner_user_id.eq.${owner.userId}`);
  if (error) safeDbError(error, "files");

  return Promise.all(
    ((data ?? []) as StorageNode[]).map(async (node) => ({
      ...toPublicNode(node),
      usedBytes: node.is_platform_node ? null : await sumActiveBytesForNode(node.id),
    })),
  );
}

export async function connectR2StorageNode(input: {
  displayName: string;
  bucket: string;
  region?: string | null;
  publicBaseUrl?: string | null;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  accessToken?: string | null;
}) {
  const owner = await resolveOwner(input.accessToken);
  const plan = await resolvePlanForOwner(owner);
  if (!plan.canByos) throw new Error("YSOP (Your Storages at One Place) requires the Pro plan.");

  const displayName = input.displayName.trim().slice(0, 100) || "My Cloudflare R2";
  const bucket = input.bucket.trim();
  if (!bucket) throw new Error("Bucket name is required");

  const creds: R2Credentials = {
    accountId: input.accountId.trim(),
    accessKeyId: input.accessKeyId.trim(),
    secretAccessKey: input.secretAccessKey.trim(),
  };
  await testR2Connection(creds, bucket); // throws if credentials/bucket are invalid

  const db = await admin();
  const { data, error } = await db
    .from("storage_nodes")
    .insert({
      name: displayName,
      display_name: displayName,
      provider: "r2",
      bucket,
      region: input.region ?? null,
      public_base_url: input.publicBaseUrl ?? null,
      is_platform_node: false,
      is_default: false,
      enabled: true,
      owner_user_id: owner.userId,
      credentials: encryptCredentials(creds),
      quota: DEFAULT_BYOS_QUOTA,
    })
    .select()
    .single();
  if (error) safeDbError(error, "files");
  return { ...toPublicNode(data as StorageNode), usedBytes: 0 };
}

async function requireOwnedNode(id: string, ownerId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("storage_nodes")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", ownerId)
    .eq("is_platform_node", false)
    .maybeSingle();
  if (error) safeDbError(error, "files");
  if (!data) throw new Error("Storage node not found");
  return { db, node: data as StorageNode };
}

export async function testStorageNodeConnection(id: string, accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const { node } = await requireOwnedNode(id, owner.userId);
  if (node.provider !== "r2") throw new Error(`Testing "${node.provider}" is not implemented yet`);
  const { decryptCredentials } = await import("./storage/crypto.server");
  const creds = decryptCredentials<R2Credentials>(node.credentials!);
  await testR2Connection(creds, node.bucket!);
  return { ok: true };
}

export async function disconnectStorageNode(id: string, accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const { db, node } = await requireOwnedNode(id, owner.userId);
  const plan = await resolvePlanForOwner(owner);

  if (plan.canByos) {
    const { count: nodeCount, error: nodeCountError } = await db
      .from("storage_nodes")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", owner.userId)
      .eq("is_platform_node", false);
    if (nodeCountError) safeDbError(nodeCountError, "files");
    if ((nodeCount ?? 0) <= 1) {
      throw new Error(
        "YSOP (Your Storages at One Place) requires at least one connected storage on Pro. Connect another bucket before removing this one.",
      );
    }
  }

  const { count, error: countError } = await db
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("storage_node_id", node.id);
  if (countError) safeDbError(countError, "files");
  if (count && count > 0) {
    throw new Error(
      `"${node.display_name ?? node.name}" still has ${count} file${count === 1 ? "" : "s"} on it. Delete or move them before disconnecting — YSOP never deletes files from your own bucket automatically.`,
    );
  }

  const { error } = await db.from("storage_nodes").delete().eq("id", node.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

/** Lets the owner raise or lower their personal node's limit; must stay at or above what's already stored there. */
export async function updateStorageNodeQuota(
  id: string,
  quotaBytes: number,
  accessToken?: string | null,
) {
  const owner = await resolveOwner(accessToken);
  const { db, node } = await requireOwnedNode(id, owner.userId);
  if (!Number.isFinite(quotaBytes) || quotaBytes <= 0)
    throw new Error("Set a limit greater than 0.");

  const used = await sumActiveBytesForNode(node.id);
  if (quotaBytes < used) {
    throw new Error(
      `This node already has ${(used / 1024 / 1024 / 1024).toFixed(2)} GB stored — set a limit at or above that.`,
    );
  }

  const { error } = await db.from("storage_nodes").update({ quota: quotaBytes }).eq("id", node.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

export async function startUpload(input: {
  filename: string;
  size: number;
  mimeType: string;
  expiryHours: number;
  isPermanent?: boolean | undefined;
  storageNodeId?: string | null | undefined;
  accessToken?: string | null | undefined;
}) {
  const owner = await resolveOwner(input.accessToken);
  const { rateLimit } = await import("./rate-limit.server");
  await rateLimit(`upload-start:${owner.userId}`, 30, 60);
  const plan = await resolvePlanForOwner(owner);

  if (input.isPermanent && !plan.canPermanentLinks)
    throw new Error("Permanent links require the Pro plan.");
  if (!input.isPermanent && !plan.expiryOptions.some((o) => o.hours === input.expiryHours))
    throw new Error("Invalid expiry option");

  if (input.size <= 0 || input.size > plan.maxFileSize)
    throw new Error(`Files must be between 1 byte and ${plan.maxFileSize / 1024 / 1024} MB`);

  if (input.storageNodeId && !plan.canByos)
    throw new Error("Choosing a personal storage destination requires the Pro plan.");

  const slug = makeSlug();

  const filename = safeFilename(input.filename);
  const storageKey = `${slug}/${filename}`;
  const { node, provider } = await resolveStorage(input.storageNodeId, owner.userId);

  if (node.is_platform_node) {
    const lifetimeUploads = await getLifetimePlatformUploads(owner);
    if (lifetimeUploads >= plan.maxActiveFiles) {
      throw new Error(
        `You've reached the ${plan.maxActiveFiles} lifetime upload limit for platform storage. Upgrade to Pro and connect your own storage with YSOP to keep uploading.`,
      );
    }
    const usedBytes = await sumActiveBytes(owner, true);
    if (usedBytes + input.size > plan.maxStorage) {
      throw new Error(
        `Platform storage is limited to ${plan.maxStorage / 1024 / 1024} MB total. Delete a file to free up space, or connect your own storage.`,
      );
    }
  } else if (node.quota) {
    const usedBytes = await sumActiveBytesForNode(node.id);
    if (usedBytes + input.size > node.quota) {
      throw new Error(
        `"${node.display_name ?? node.name}" is limited to ${(node.quota / 1024 / 1024 / 1024).toFixed(1)} GB. Delete a file, raise the limit in Settings, or free up space.`,
      );
    }
  }
  const signed = await provider.createSignedUpload(storageKey, input.mimeType);

  return { slug, storageKey, storageNodeId: node.id, upload: signed };
}

export async function finishUpload(input: {
  slug: string;
  storageKey: string;
  storageNodeId: string;
  filename: string;
  size: number;
  mimeType: string;
  expiryHours: number;
  isPermanent?: boolean | undefined;
  folderId?: string | null | undefined;
  accessToken?: string | null | undefined;
}) {
  const owner = await resolveOwner(input.accessToken);
  const { rateLimit } = await import("./rate-limit.server");
  await rateLimit(`upload-finish:${owner.userId}`, 30, 60);
  const plan = await resolvePlanForOwner(owner);
  if (input.isPermanent && !plan.canPermanentLinks)
    throw new Error("Permanent links require the Pro plan.");
  if (input.folderId) await assertOwnedFolderOrRoot(input.folderId, owner.userId);

  const db = await admin();
  const expiresAt = input.isPermanent
    ? null
    : new Date(Date.now() + input.expiryHours * 3600_000).toISOString();

  const { data, error } = await db
    .from("files")
    .insert({
      slug: input.slug,
      filename: safeFilename(input.filename),
      mime_type: input.mimeType || "application/octet-stream",
      size: input.size,
      storage_node_id: input.storageNodeId,
      storage_key: input.storageKey,
      expires_at: expiresAt,
      is_permanent: Boolean(input.isPermanent),
      folder_id: input.folderId ?? null,
      user_id: owner.userId,
    })
    .select()
    .single();

  if (error) safeDbError(error, "files");
  const { node, provider } = await resolveStorage(input.storageNodeId, owner.userId);
  if (node.is_platform_node) await incrementLifetimePlatformUploads(owner);
  return { ...data, srcUrl: provider.getPublicUrl?.(input.storageKey) ?? null };
}

export async function listOwned(accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const db = await admin();
  const { data, error } = await db
    .from("files")
    .select("*")
    .eq("user_id", owner.userId)
    .or(activeFilterExpr(new Date().toISOString()))
    .order("created_at", { ascending: false });
  if (error) safeDbError(error, "files");
  if (!data?.length) return [];

  const nodeIds = [...new Set(data.map((f) => f.storage_node_id))];
  const resolved = new Map(
    await Promise.all(
      nodeIds.map(async (nodeId) => [nodeId, await resolveStorage(nodeId)] as const),
    ),
  );

  return data.map((f) => {
    const entry = resolved.get(f.storage_node_id);
    return {
      ...f,
      srcUrl: entry?.provider.getPublicUrl?.(f.storage_key) ?? null,
      storageLabel: entry?.node.is_platform_node
        ? "Free Storage"
        : (entry?.node.display_name ?? entry?.node.name ?? "Storage"),
    };
  });
}

async function requireOwnedFile(id: string, accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const db = await admin();
  const { data, error } = await db
    .from("files")
    .select("*")
    .eq("id", id)
    .eq("user_id", owner.userId)
    .maybeSingle();
  if (error) safeDbError(error, "files");
  if (!data) throw new Error("File not found");
  return { db, file: data };
}

export async function listFolderTree(accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const db = await admin();
  const { data, error } = await db
    .from("folders")
    .select("*")
    .eq("owner_user_id", owner.userId)
    .order("name", { ascending: true });
  if (error) safeDbError(error, "files");
  return data ?? [];
}

async function folderSlugTaken(slug: string): Promise<boolean> {
  const db = await admin();
  const { count } = await db
    .from("folders")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);
  return (count ?? 0) > 0;
}

export const MAX_FOLDER_DEPTH = 5;

/** Depth of `folderId` itself (1 = a root-level folder). Walks the parent chain. */
async function folderDepth(folderId: string, ownerId: string): Promise<number> {
  const db = await admin();
  let depth = 1;
  let current: string | null = folderId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) break; // defensive: never loop on a cyclic chain
    seen.add(current);
    const { data }: { data: { parent_folder_id: string | null } | null } = await db
      .from("folders")
      .select("parent_folder_id")
      .eq("id", current)
      .eq("owner_user_id", ownerId)
      .maybeSingle();
    if (!data?.parent_folder_id) break;
    current = data.parent_folder_id;
    depth += 1;
  }
  return depth;
}

export async function createFolder(
  name: string,
  parentFolderId: string | null,
  accessToken?: string | null,
) {
  const owner = await resolveOwner(accessToken);
  const clean = name.trim().slice(0, 100);
  if (!clean) throw new Error("Name cannot be empty");

  if (parentFolderId) {
    await assertOwnedFolderOrRoot(parentFolderId, owner.userId);
    const parentDepth = await folderDepth(parentFolderId, owner.userId);
    if (parentDepth >= MAX_FOLDER_DEPTH) {
      throw new Error(`Folders can only be nested ${MAX_FOLDER_DEPTH} levels deep.`);
    }
  }

  let slug = makeSlug();
  while (await folderSlugTaken(slug)) slug = makeSlug();

  const db = await admin();
  const { data, error } = await db
    .from("folders")
    .insert({ owner_user_id: owner.userId, name: clean, slug, parent_folder_id: parentFolderId })
    .select()
    .single();
  if (error) safeDbError(error, "files");
  return data;
}

async function requireOwnedFolder(id: string, ownerId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("folders")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", ownerId)
    .maybeSingle();
  if (error) safeDbError(error, "files");
  if (!data) throw new Error("Folder not found");
  return { db, folder: data };
}

export async function renameFolder(id: string, name: string, accessToken?: string | null) {
  const owner = await resolveOwner(accessToken);
  const { db, folder } = await requireOwnedFolder(id, owner.userId);
  const clean = name.trim().slice(0, 100);
  if (!clean) throw new Error("Name cannot be empty");
  const { error } = await db
    .from("folders")
    .update({ name: clean, updated_at: new Date().toISOString() })
    .eq("id", folder.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

/** Deleting a folder either moves its files to Root or deletes them along with it. */
export async function deleteFolder(
  id: string,
  mode: "move-to-root" | "delete-files",
  accessToken?: string | null,
) {
  const owner = await resolveOwner(accessToken);
  const { db, folder } = await requireOwnedFolder(id, owner.userId);

  if (mode === "delete-files") {
    const { data: files, error: filesError } = await db
      .from("files")
      .select("id, storage_key, storage_node_id")
      .eq("folder_id", folder.id)
      .eq("user_id", owner.userId);
    if (filesError) safeDbError(filesError, "files");
    for (const file of files ?? []) {
      const { provider } = await resolveStorage(file.storage_node_id);
      await provider.remove([file.storage_key]);
    }
    if (files?.length) {
      const { error } = await db
        .from("files")
        .delete()
        .in(
          "id",
          files.map((f) => f.id),
        );
      if (error) safeDbError(error, "files");
    }
  } else {
    const { error } = await db.from("files").update({ folder_id: null }).eq("folder_id", folder.id);
    if (error) safeDbError(error, "files");
  }

  const { error } = await db.from("folders").delete().eq("id", folder.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

async function assertOwnedFolderOrRoot(folderId: string | null, ownerId: string): Promise<void> {
  if (!folderId) return;
  const db = await admin();
  const { data } = await db
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .eq("owner_user_id", ownerId)
    .maybeSingle();
  if (!data) throw new Error("Folder not found");
}

export async function moveFolder(
  id: string,
  targetFolderId: string | null,
  accessToken?: string | null,
) {
  const owner = await resolveOwner(accessToken);
  const { db, folder } = await requireOwnedFolder(id, owner.userId);
  await assertOwnedFolderOrRoot(targetFolderId, owner.userId);

  if (targetFolderId === folder.id) throw new Error("A folder cannot be moved into itself.");

  const { data: allFolders, error } = await db
    .from("folders")
    .select("id, parent_folder_id")
    .eq("owner_user_id", owner.userId);
  if (error) safeDbError(error, "files");
  const rows = allFolders ?? [];

  const childrenOf = new Map<string, string[]>();
  for (const f of rows) {
    if (!f.parent_folder_id) continue;
    childrenOf.set(f.parent_folder_id, [...(childrenOf.get(f.parent_folder_id) ?? []), f.id]);
  }

  // Target must not be `id` itself or one of its descendants.
  if (targetFolderId) {
    const stack = [...(childrenOf.get(folder.id) ?? [])];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === targetFolderId)
        throw new Error("A folder cannot be moved into its own subfolder.");
      stack.push(...(childrenOf.get(cur) ?? []));
    }
  }

  const subtreeHeight = (folderId: string): number => {
    const children = childrenOf.get(folderId) ?? [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(subtreeHeight));
  };

  const targetDepth = targetFolderId ? await folderDepth(targetFolderId, owner.userId) : 0;
  if (targetDepth + subtreeHeight(folder.id) > MAX_FOLDER_DEPTH) {
    throw new Error(`Folders can only be nested ${MAX_FOLDER_DEPTH} levels deep.`);
  }

  const { error: updateError } = await db
    .from("folders")
    .update({ parent_folder_id: targetFolderId, updated_at: new Date().toISOString() })
    .eq("id", folder.id);
  if (updateError) safeDbError(updateError, "files");
  return { ok: true };
}

export async function moveFile(id: string, folderId: string | null, accessToken?: string | null) {
  const { db, file } = await requireOwnedFile(id, accessToken);
  await assertOwnedFolderOrRoot(folderId, file.user_id!);
  const { error } = await db.from("files").update({ folder_id: folderId }).eq("id", file.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

export async function moveFiles(
  ids: string[],
  folderId: string | null,
  accessToken?: string | null,
) {
  const owner = await resolveOwner(accessToken);
  await assertOwnedFolderOrRoot(folderId, owner.userId);
  const db = await admin();
  const { error } = await db
    .from("files")
    .update({ folder_id: folderId })
    .in("id", ids)
    .eq("user_id", owner.userId);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

export async function renameOwned(id: string, filename: string, accessToken?: string | null) {
  const { db, file } = await requireOwnedFile(id, accessToken);
  const clean = safeFilename(filename);
  if (!clean) throw new Error("Name cannot be empty");
  const { error } = await db.from("files").update({ filename: clean }).eq("id", file.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

/** Toggling to Permanent clears the expiry; toggling back to Temporary requires a valid expiry choice. */
export async function setPermanentStatus(
  id: string,
  isPermanent: boolean,
  expiryHours: number | null,
  accessToken?: string | null,
) {
  const { db, file } = await requireOwnedFile(id, accessToken);
  const plan = await resolvePlanForOwner({ userId: file.user_id! });
  if (!plan.canPermanentLinks) throw new Error("Permanent links require the Pro plan.");

  if (isPermanent) {
    const { error } = await db
      .from("files")
      .update({ is_permanent: true, expires_at: null })
      .eq("id", file.id);
    if (error) safeDbError(error, "files");
  } else {
    if (!expiryHours || !plan.expiryOptions.some((o) => o.hours === expiryHours))
      throw new Error("Choose a valid expiry to make this file temporary again.");
    const expiresAt = new Date(Date.now() + expiryHours * 3600_000).toISOString();
    const { error } = await db
      .from("files")
      .update({ is_permanent: false, expires_at: expiresAt })
      .eq("id", file.id);
    if (error) safeDbError(error, "files");
  }
  return { ok: true };
}

export async function deleteOwned(id: string, accessToken?: string | null) {
  const { db, file } = await requireOwnedFile(id, accessToken);
  const { provider } = await resolveStorage(file.storage_node_id);
  await provider.remove([file.storage_key]);
  const { error } = await db.from("files").delete().eq("id", file.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

export async function startReplace(input: {
  id: string;
  mimeType: string;
  size: number;
  accessToken?: string | null | undefined;
}) {
  const { file } = await requireOwnedFile(input.id, input.accessToken);
  if (file.mime_type !== input.mimeType)
    throw new Error(`Replacement must be the same file type (${file.mime_type})`);

  const owner: Owner = { userId: file.user_id! };
  const plan = await resolvePlanForOwner(owner);
  if (!plan.canReplace) throw new Error("Replacing files requires the Pro plan.");

  if (input.size <= 0 || input.size > plan.maxFileSize)
    throw new Error(`File is too large (max ${plan.maxFileSize / 1024 / 1024} MB)`);

  const { node, provider } = await resolveStorage(file.storage_node_id);
  if (node.is_platform_node) {
    const usedBytes = await sumActiveBytes(owner, true);
    const projected = usedBytes - Number(file.size) + input.size;
    if (projected > plan.maxStorage) {
      throw new Error(
        `Your plan gets ${plan.maxStorage / 1024 / 1024} MB total storage. Delete a file or free up space.`,
      );
    }
  } else if (node.quota) {
    const usedBytes = await sumActiveBytesForNode(node.id);
    const projected = usedBytes - Number(file.size) + input.size;
    if (projected > node.quota) {
      throw new Error(
        `"${node.display_name ?? node.name}" is limited to ${(node.quota / 1024 / 1024 / 1024).toFixed(1)} GB. Delete a file, raise the limit in Settings, or free up space.`,
      );
    }
  }

  const upload = await provider.createSignedUpload(file.storage_key, input.mimeType);
  return { storageKey: file.storage_key, upload };
}

export async function finishReplace(input: {
  id: string;
  size: number;
  accessToken?: string | null | undefined;
}) {
  const { db, file } = await requireOwnedFile(input.id, input.accessToken);
  const { error } = await db.from("files").update({ size: input.size }).eq("id", file.id);
  if (error) safeDbError(error, "files");
  return { ok: true };
}

/** Owner-authenticated download. */
export async function downloadUrlForOwned(id: string, accessToken?: string | null) {
  const { file } = await requireOwnedFile(id, accessToken);
  // Generous enough for a large folder ZIP (many files, one call each) while still
  // capping runaway/scripted use.
  const { rateLimit } = await import("./rate-limit.server");
  await rateLimit(`download-owned:${file.user_id}`, 120, 60);
  const db = await admin();
  const { provider } = await resolveStorage(file.storage_node_id);
  const url = await provider.createSignedDownload(file.storage_key, file.filename);
  await db
    .from("files")
    .update({ downloads: (file.downloads ?? 0) + 1 })
    .eq("id", file.id);
  return { url };
}

export async function publicFileBySlug(slug: string) {
  const db = await admin();
  const { data } = await db
    .from("files")
    .select(
      "slug, filename, mime_type, size, downloads, created_at, expires_at, is_permanent, storage_key, storage_node_id",
    )
    .eq("slug", slug)
    .or(activeFilterExpr(new Date().toISOString()))
    .maybeSingle();
  if (!data) return null;

  const { storage_key, storage_node_id, ...file } = data;
  const { provider } = await resolveStorage(storage_node_id);
  return {
    ...file,
    srcUrl: provider.getPublicUrl?.(storage_key) ?? null,
  };
}

/** Public folder listing: the folder's name plus every active file inside it, no ownership required. */
export async function publicFolderBySlug(slug: string) {
  const db = await admin();
  const { data: folder } = await db
    .from("folders")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!folder) return null;

  const { data: files, error } = await db
    .from("files")
    .select(
      "slug, filename, mime_type, size, created_at, expires_at, is_permanent, storage_key, storage_node_id",
    )
    .eq("folder_id", folder.id)
    .or(activeFilterExpr(new Date().toISOString()))
    .order("created_at", { ascending: false });
  if (error) safeDbError(error, "files");
  if (!files?.length) return { name: folder.name, files: [] };

  const nodeIds = [...new Set(files.map((f) => f.storage_node_id))];
  const providers = new Map(
    await Promise.all(
      nodeIds.map(async (nodeId) => [nodeId, (await resolveStorage(nodeId)).provider] as const),
    ),
  );

  return {
    name: folder.name,
    files: files.map(({ storage_key, storage_node_id, ...file }) => ({
      ...file,
      srcUrl: providers.get(storage_node_id)?.getPublicUrl?.(storage_key) ?? null,
    })),
  };
}

export async function downloadUrlForSlug(slug: string) {
  // Scoped per-slug (not per-IP — this function has no request context) to stop a single
  // public link from being hammered for repeated signed-URL minting / download-count spam.
  const { rateLimit } = await import("./rate-limit.server");
  await rateLimit(`download:${slug}`, 60, 60);

  const db = await admin();
  const { data: file } = await db
    .from("files")
    .select("*")
    .eq("slug", slug)
    .or(activeFilterExpr(new Date().toISOString()))
    .maybeSingle();
  if (!file) throw new Error("This link has expired or does not exist.");

  const { provider } = await resolveStorage(file.storage_node_id);
  const url = await provider.createSignedDownload(file.storage_key, file.filename);
  await db
    .from("files")
    .update({ downloads: (file.downloads ?? 0) + 1 })
    .eq("id", file.id);
  return { url };
}

/** Expiry worker: deletes expired objects and their metadata. */
export async function purgeExpired() {
  const db = await admin();
  const { data: expired, error } = await db
    .from("files")
    .select("id, storage_key, storage_node_id")
    .eq("is_permanent", false)
    .lt("expires_at", new Date().toISOString())
    .limit(500);
  if (error) safeDbError(error, "files");
  if (!expired?.length) return { deleted: 0 };

  const byNode = new Map<string, string[]>();
  for (const row of expired) {
    const nodeId = row.storage_node_id ?? "";
    const list = byNode.get(nodeId) ?? [];
    list.push(row.storage_key);
    byNode.set(nodeId, list);
  }
  for (const [nodeId, keys] of byNode) {
    const { provider } = await resolveStorage(nodeId || null);
    await provider.remove(keys);
  }
  await db
    .from("files")
    .delete()
    .in(
      "id",
      expired.map((r) => r.id),
    );
  return { deleted: expired.length };
}
