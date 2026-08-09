"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  FileUp,
  Link2,
  Loader2,
  LogIn,
  QrCode,
  UploadCloud,
  X,
  AlertTriangle,
  CloudOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  startUploadAction,
  finishUploadAction,
  getUsageAction,
  listStorageNodesAction,
  listFoldersAction,
} from "@/app/actions/files";
import { CapsuleIconButton } from "@/components/capsule-icon-button";
import { withAuth } from "@/lib/call-action";
import { formatBytes, fileKind } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type StorageNode = {
  id: string;
  displayName: string;
  isPlatformNode: boolean;
  quotaBytes: number | null;
  usedBytes: number | null;
};

type FolderOption = { id: string; name: string };

const LAST_NODE_KEY = "ysop:selected-storage-node";

type Item = {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error" | "cancelled";
  progress: number;
  slug?: string;
  srcUrl?: string | null;
  error?: string;
  xhr?: XMLHttpRequest;
};

function shareUrl(slug: string) {
  return typeof window === "undefined" ? `/f/${slug}` : `${window.location.origin}/f/${slug}`;
}

/** Non-image extensions accepted from a clipboard paste — images are covered separately via MIME type. */
const PASTE_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "rtf",
  "md",
  "odt",
  "xls",
  "xlsx",
  "csv",
  "ods",
  "ppt",
  "pptx",
  "odp",
]);

function isMajorFileType(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return PASTE_ALLOWED_EXTENSIONS.has(ext);
}

/** Handles both a real file copy (clipboard `.files`) and an image copy like a screenshot (`.items`). */
function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []);
  if (files.length) return files;
  return Array.from(data.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((f): f is File => f !== null);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function UploadWidget({ accept }: { accept?: string }) {
  const { user, loading } = useAuth();
  const staticPlan = PLANS.free;

  const [expiry, setExpiry] = useState<number>(72);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    planLabel: string;
    remaining: number;
    limit: number;
    capabilities: {
      maxFileSize: number;
      expiryOptions: readonly { label: string; hours: number }[];
      canByos: boolean;
      canPermanentLinks: boolean;
      canFolders: boolean;
    };
  } | null>(null);
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPermanent, setIsPermanent] = useState(false);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const planLabel = usage?.planLabel ?? staticPlan.label;
  const expiryOptions = usage?.capabilities.expiryOptions ?? staticPlan.expiryOptions;
  const maxFileSize = usage?.capabilities.maxFileSize ?? staticPlan.maxFileSize;
  const canByos = usage?.capabilities.canByos ?? false;
  const canPermanentLinks = usage?.capabilities.canPermanentLinks ?? false;
  const canFolders = usage?.capabilities.canFolders ?? false;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  useEffect(() => {
    setSelectedNodeId(localStorage.getItem(LAST_NODE_KEY));
  }, []);

  useEffect(() => {
    if (nodes.length === 0) return;
    if (!nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(nodes[0]!.id);
    }
  }, [nodes, selectedNodeId]);

  const refreshUsage = useCallback(async () => {
    const result = await getUsageAction(await withAuth({}));
    setUsage(result);
  }, []);

  useEffect(() => {
    if (user) void refreshUsage();
  }, [refreshUsage, user]);

  const [nodesLoaded, setNodesLoaded] = useState(false);

  const refreshNodes = useCallback(async () => {
    const result = await listStorageNodesAction(await withAuth({}));
    setNodes((result as StorageNode[]).filter((n) => !n.isPlatformNode));
    setNodesLoaded(true);
  }, []);

  useEffect(() => {
    if (canByos) void refreshNodes();
  }, [canByos, refreshNodes]);

  useEffect(() => {
    if (!canFolders) return;
    (async () => {
      const result = await listFoldersAction(await withAuth({}));
      setFolders(result as FolderOption[]);
    })();
  }, [canFolders]);

  const patch = useCallback((id: string, next: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...next } : i)));
  }, []);

  const uploadOne = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      setItems((prev) => [
        { id, name: file.name, size: file.size, status: "uploading", progress: 0 },
        ...prev,
      ]);

      if (file.size > maxFileSize) {
        patch(id, { status: "error", error: `Larger than ${formatBytes(maxFileSize)}` });
        return;
      }

      const permanent = canPermanentLinks && isPermanent;

      try {
        const start = await startUploadAction(
          await withAuth({
            filename: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            expiryHours: expiry,
            isPermanent: permanent,
            storageNodeId: canByos ? selectedNodeId : null,
          }),
        );

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          patch(id, { xhr });
          xhr.open(start.upload.method, start.upload.url, true);
          for (const [k, v] of Object.entries(start.upload.headers)) xhr.setRequestHeader(k, v);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) patch(id, { progress: Math.round((e.loaded / e.total) * 100) });
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Upload failed (${xhr.status})`));
          xhr.onerror = () => {
            // A personal bucket target with no readable status means the browser blocked the
            // cross-origin request outright — almost always a missing CORS policy on the bucket.
            const isPersonalNode = nodes.some((n) => n.id === start.storageNodeId);
            reject(new Error(isPersonalNode ? "CORS_BLOCKED" : "Network error during upload"));
          };
          xhr.onabort = () => reject(new Error("cancelled"));
          xhr.send(file);
        });

        const finished = await finishUploadAction(
          await withAuth({
            slug: start.slug,
            storageKey: start.storageKey,
            storageNodeId: start.storageNodeId,
            filename: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            expiryHours: expiry,
            isPermanent: permanent,
            folderId: canFolders ? selectedFolderId : null,
          }),
        );

        patch(id, { status: "done", progress: 100, slug: start.slug, srcUrl: finished.srcUrl });
        void refreshUsage();
        void refreshNodes();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        if (message === "cancelled") {
          patch(id, { status: "cancelled" });
        } else if (message === "CORS_BLOCKED") {
          patch(id, {
            status: "error",
            error: "Blocked by your bucket's CORS policy — see the fix guide",
          });
          toast.error("Upload blocked by your bucket's CORS policy", {
            description:
              "Your browser blocked the request. Add a CORS policy on your R2 bucket allowing this site, then try again.",
            action: {
              label: "View guide",
              onClick: () =>
                window.open("/docs/finding-r2-keys#5-set-the-buckets-cors-policy", "_blank"),
            },
          });
        } else {
          patch(id, { status: "error", error: message });
          toast.error(message);
        }
      }
    },
    [
      expiry,
      patch,
      maxFileSize,
      refreshUsage,
      refreshNodes,
      canByos,
      selectedNodeId,
      canPermanentLinks,
      isPermanent,
      canFolders,
      selectedFolderId,
    ],
  );

  const handleFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      Array.from(list).forEach((f) => void uploadOne(f));
    },
    [uploadOne],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const files = filesFromClipboard(e.clipboardData).filter(isMajorFileType);
      if (files.length === 0) return;
      e.preventDefault();
      handleFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  const copy = async (slug: string) => {
    await navigator.clipboard.writeText(shareUrl(slug));
    toast.success("Share link copied");
  };

  const copySrc = async (srcUrl: string) => {
    await navigator.clipboard.writeText(srcUrl);
    toast.success("Source link copied");
  };

  const openQr = async (slug: string) => {
    setQrFor(slug);
    setQrImage(null);
    const QRCode = (await import("qrcode")).default;
    setQrImage(await QRCode.toDataURL(shareUrl(slug), { margin: 1, width: 480 }));
  };

  const completed = items.filter((i) => i.status === "done").length;
  const inProgress = items.filter((i) => i.status === "uploading").length;
  const overall = items.length
    ? Math.round(
        items.reduce((a, i) => a + (i.status === "done" ? 100 : i.progress), 0) / items.length,
      )
    : 0;

  if (loading) {
    return (
      <div className="panel flex items-center justify-center overflow-hidden py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="panel overflow-hidden">
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
            <LogIn className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">Sign in to upload</p>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              YSOP requires a free account so your files, links, and expiry settings stay yours.
            </p>
          </div>
          <Button asChild size="lg" className="mt-1">
            <Link href="/auth">
              <LogIn className="size-4" /> Sign in with Google
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (canByos && nodesLoaded && nodes.length === 0) {
    return (
      <div className="panel overflow-hidden">
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
            <CloudOff className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">Connect a storage bucket to start uploading</p>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              YSOP (Your Storages at One Place) requires at least one connected Cloudflare R2 bucket
              on Pro — add one to enable uploads.
            </p>
          </div>
          <Button asChild size="lg" className="mt-1">
            <Link href="/settings/storage">
              <UploadCloud className="size-4" /> Add storage
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight">Upload files</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {inProgress > 0 ? "Uploading" : "Ready"}
        </span>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{planLabel} plan</span>
          {selectedNode ? (
            <span>
              {selectedNode.quotaBytes
                ? `${formatBytes(Math.max(0, selectedNode.quotaBytes - (selectedNode.usedBytes ?? 0)))} of ${formatBytes(selectedNode.quotaBytes)} left`
                : "No limit set"}{" "}
              on <span className="text-foreground">{selectedNode.displayName}</span>
            </span>
          ) : (
            usage && (
              <span>
                {formatBytes(usage.remaining)} of {formatBytes(usage.limit)} left
              </span>
            )
          )}
        </div>

        {canFolders && folders.length > 0 && (
          <div>
            <div className="label-caps">Save to</div>
            <select
              value={selectedFolderId ?? ""}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
              className="mt-2.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
            >
              <option value="">Root</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {canByos && nodes.length > 0 && (
          <div>
            <div className="label-caps">Store in</div>
            <div className="mt-2.5 space-y-1.5">
              {nodes.map((n) => (
                <label
                  key={n.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    selectedNodeId === n.id
                      ? "border-primary bg-success-soft"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="storage-node"
                    className="accent-primary"
                    checked={selectedNodeId === n.id}
                    onChange={() => {
                      setSelectedNodeId(n.id);
                      if (n.id) localStorage.setItem(LAST_NODE_KEY, n.id);
                      else localStorage.removeItem(LAST_NODE_KEY);
                    }}
                  />
                  {n.displayName}
                </label>
              ))}
            </div>
          </div>
        )}

        {canPermanentLinks && (
          <div>
            <div className="label-caps">Expiration</div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPermanent(false)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  !isPermanent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
                )}
              >
                Custom expiry
              </button>
              <button
                type="button"
                onClick={() => setIsPermanent(true)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  isPermanent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
                )}
              >
                Permanent
              </button>
            </div>
          </div>
        )}

        {!isPermanent && (
          <div>
            <div className="label-caps">Auto delete after</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {expiryOptions.map((o) => (
                <button
                  key={o.hours}
                  type="button"
                  onClick={() => setExpiry(o.hours)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    expiry === o.hours
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragging
              ? "border-primary bg-success-soft"
              : "border-border bg-secondary/50 hover:border-primary/50",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
            <UploadCloud className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium">Drag &amp; drop files here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse, or paste (Ctrl/Cmd+V) an image or doc — up to{" "}
            {formatBytes(maxFileSize)} per file
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            {...(accept ? { accept } : {})}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      item.status === "done" && "bg-primary text-primary-foreground",
                      item.status === "uploading" && "bg-success-soft text-primary",
                      (item.status === "error" || item.status === "cancelled") &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.status === "done" ? (
                      <Check className="size-3.5" />
                    ) : item.status === "uploading" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : item.status === "error" ? (
                      <AlertTriangle className="size-3.5" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium">
                        {item.name}
                      </span>
                      <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {fileKind("", item.name)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBytes(item.size)}
                      {item.status === "uploading" && ` · ${item.progress}%`}
                      {item.status === "error" && ` · ${item.error}`}
                      {item.status === "cancelled" && " · cancelled"}
                      {item.status === "done" && ` · /f/${item.slug}`}
                    </p>
                    {item.status === "uploading" && (
                      <Progress value={item.progress} className="mt-2 h-1.5" />
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {item.status === "uploading" && (
                      <Button variant="ghost" size="sm" onClick={() => item.xhr?.abort()}>
                        Cancel
                      </Button>
                    )}
                    {item.status === "done" && item.slug && (
                      <>
                        <CapsuleIconButton
                          icon={Copy}
                          label="Copy share link"
                          onClick={() => copy(item.slug!)}
                        />
                        <CapsuleIconButton
                          icon={QrCode}
                          label="Show QR code"
                          onClick={() => openQr(item.slug!)}
                        />
                        {item.srcUrl && (
                          <CapsuleIconButton
                            icon={Link2}
                            label="Copy source link"
                            onClick={() => copySrc(item.srcUrl!)}
                          />
                        )}
                        <CapsuleIconButton
                          as={Link}
                          href={`/f/${item.slug}`}
                          icon={FileUp}
                          label="Open share page"
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-border bg-secondary/40 px-5 py-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { value: completed, label: "Completed" },
              { value: inProgress, label: "In progress" },
              { value: items.length - completed - inProgress, label: "Remaining" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-surface px-3 py-3 text-center"
              >
                <div className="text-xl font-semibold tabular-nums">{stat.value}</div>
                <div className="label-caps mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
          <Progress value={overall} className="mt-4 h-1.5" />
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>
              {isPermanent
                ? "Kept permanently"
                : `Auto delete in ${expiryOptions.find((o) => o.hours === expiry)?.label}`}
            </span>
            <span>{overall}% complete</span>
          </div>
        </div>
      )}

      <Dialog open={!!qrFor} onOpenChange={(open) => !open && setQrFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to download</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pb-2">
            {qrImage ? (
              <img
                src={qrImage}
                alt="QR code for the share link"
                className="size-56 rounded-xl border border-border"
              />
            ) : (
              <div className="flex size-56 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <code className="rounded bg-muted px-2 py-1 text-xs">
              {qrFor ? shareUrl(qrFor) : ""}
            </code>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
