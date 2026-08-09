"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CloudUpload, Loader2, Lock, LogIn, Plug, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ClaimProDialog } from "@/components/claim-pro-dialog";
import { useAuth } from "@/hooks/useAuth";
import { withAuth } from "@/lib/call-action";
import {
  getUsageAction,
  setDevPlanAction,
  listStorageNodesAction,
  connectR2StorageNodeAction,
  testStorageNodeConnectionAction,
  disconnectStorageNodeAction,
  updateStorageNodeQuotaAction,
} from "@/app/actions/files";
import { formatBytes } from "@/lib/format";

type StorageNode = {
  id: string;
  displayName: string;
  provider: string;
  bucket: string | null;
  region: string | null;
  isPlatformNode: boolean;
  isDefault: boolean;
  quotaBytes: number | null;
  usedBytes: number | null;
};

const GB = 1024 * 1024 * 1024;

const emptyForm = {
  displayName: "",
  bucket: "",
  region: "",
  publicBaseUrl: "",
  accountId: "",
  accessKeyId: "",
  secretAccessKey: "",
};

const devProSimulationEnabled = process.env["NEXT_PUBLIC_ENABLE_DEV_PRO_SIMULATION"] === "true";

export default function StorageSettingsPage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [quotaDraft, setQuotaDraft] = useState("");
  const qc = useQueryClient();

  const enabled = !loading && !!user;

  const usage = useQuery({
    queryKey: ["usage", user?.id],
    enabled,
    queryFn: async () => getUsageAction(await withAuth({})),
  });

  const nodes = useQuery({
    queryKey: ["storage-nodes", user?.id],
    enabled: enabled && usage.data?.capabilities.canByos === true,
    queryFn: async () => (await listStorageNodesAction(await withAuth({}))) as StorageNode[],
  });

  const setPlan = useMutation({
    mutationFn: async (plan: "free" | "pro") => setDevPlanAction(await withAuth({ plan })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      toast.success("Plan updated (dev only)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connect = useMutation({
    mutationFn: async () =>
      connectR2StorageNodeAction(
        await withAuth({
          displayName: form.displayName || "My Cloudflare R2",
          bucket: form.bucket,
          region: form.region || null,
          publicBaseUrl: form.publicBaseUrl || null,
          accountId: form.accountId,
          accessKeyId: form.accessKeyId,
          secretAccessKey: form.secretAccessKey,
        }),
      ),
    onSuccess: () => {
      setForm(emptyForm);
      setShowConnectForm(false);
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      toast.success("Storage connected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async (id: string) => disconnectStorageNodeAction(await withAuth({ id })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      toast.success("Storage disconnected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQuota = useMutation({
    mutationFn: async (v: { id: string; quotaBytes: number }) =>
      updateStorageNodeQuotaAction(await withAuth({ ...v })),
    onSuccess: () => {
      setEditingQuota(null);
      qc.invalidateQueries({ queryKey: ["storage-nodes"] });
      toast.success("Limit updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testConnection = async (id: string) => {
    setTestingId(id);
    try {
      await testStorageNodeConnectionAction(await withAuth({ id }));
      toast.success("Connection OK");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setTestingId(null);
    }
  };

  const canByos = usage.data?.capabilities.canByos === true;
  const personalNodes = (nodes.data ?? []).filter((n) => !n.isPlatformNode);

  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-2xl px-5 py-8 pb-28 md:py-12 md:pb-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" /> My Files
          </Link>
        </Button>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-caps">Settings</div>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Storage</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              YSOP (Your Storages at One Place) lets Pro accounts upload to their own connected
              bucket instead of platform storage.
            </p>
          </div>
        </div>

        {!loading && !user ? (
          <div className="panel mt-8 flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
              <LogIn className="size-5" />
            </span>
            <p className="text-sm font-medium">Sign in to manage storage</p>
            <Button asChild size="lg">
              <Link href="/auth">
                <LogIn className="size-4" /> Sign in with Google
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="panel mt-8 flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium">Current plan: {usage.data?.planLabel ?? "…"}</p>
                {devProSimulationEnabled && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Internal tooling — not available in production.
                  </p>
                )}
              </div>
              {devProSimulationEnabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setPlan.isPending || !usage.data}
                  onClick={() => setPlan.mutate(canByos ? "free" : "pro")}
                >
                  {setPlan.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : canByos ? (
                    "Switch to Free (dev)"
                  ) : (
                    "Simulate Pro (dev)"
                  )}
                </Button>
              ) : (
                !canByos && (
                  <ClaimProDialog>
                    <Button size="sm">Go Pro (Claim Free)</Button>
                  </ClaimProDialog>
                )
              )}
            </div>

            {!canByos ? (
              <div className="panel mt-4 flex items-center gap-3 p-5 text-sm text-muted-foreground">
                <Lock className="size-4 shrink-0" />
                YSOP (Your Storages at One Place) requires the Pro plan.
              </div>
            ) : (
              <div className="panel mt-4 divide-y divide-border overflow-hidden">
                {personalNodes.length === 0 && (
                  <div className="flex items-center gap-3 bg-warning-soft px-5 py-4 text-sm text-foreground">
                    <Lock className="size-4 shrink-0" />
                    Add at least one Cloudflare R2 bucket to enable uploads — YSOP requires a
                    connected storage on Pro.
                  </div>
                )}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-primary">
                      <CloudUpload className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Cloudflare R2</p>
                      <p className="text-xs text-muted-foreground">
                        {personalNodes.length ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {!showConnectForm && (
                    <Button size="sm" variant="outline" onClick={() => setShowConnectForm(true)}>
                      <Plug className="size-4" /> Connect
                    </Button>
                  )}
                </div>

                {personalNodes.map((n) => {
                  const used = n.usedBytes ?? 0;
                  const quota = n.quotaBytes ?? 0;
                  const percentage = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
                  return (
                    <div key={n.id} className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            <CheckCircle2 className="size-3.5 text-primary" /> {n.displayName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Bucket: {n.bucket}
                            {n.region ? ` · ${n.region}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={testingId === n.id}
                            onClick={() => testConnection(n.id)}
                          >
                            {testingId === n.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Test connection"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnect.mutate(n.id)}
                            disabled={disconnect.isPending || personalNodes.length <= 1}
                            title={
                              personalNodes.length <= 1
                                ? "At least one connected storage is required on Pro"
                                : undefined
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3">
                        {editingQuota === n.id ? (
                          <form
                            className="flex items-center gap-1.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const gb = Number(quotaDraft);
                              if (gb > 0) updateQuota.mutate({ id: n.id, quotaBytes: gb * GB });
                            }}
                          >
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={quotaDraft}
                              onChange={(e) => setQuotaDraft(e.target.value)}
                              className="h-8 w-24"
                              autoFocus
                            />
                            <span className="text-xs text-muted-foreground">GB limit</span>
                            <Button type="submit" size="sm" disabled={updateQuota.isPending}>
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingQuota(null)}
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {formatBytes(used)} of{" "}
                              {quota > 0 ? formatBytes(quota) : "no limit set"} used
                            </span>
                            <button
                              type="button"
                              className="font-medium text-foreground underline underline-offset-4"
                              onClick={() => {
                                setEditingQuota(n.id);
                                setQuotaDraft(quota > 0 ? (quota / GB).toString() : "9");
                              }}
                            >
                              Change limit
                            </button>
                          </div>
                        )}
                        {quota > 0 && (
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {showConnectForm && (
                  <form
                    className="space-y-3 px-5 py-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      connect.mutate();
                    }}
                  >
                    <Input
                      placeholder="Display name (e.g. My R2)"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    />
                    <Input
                      placeholder="Bucket name"
                      required
                      value={form.bucket}
                      onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                    />
                    <Input
                      placeholder="Public base URL (optional, for source links)"
                      value={form.publicBaseUrl}
                      onChange={(e) => setForm({ ...form, publicBaseUrl: e.target.value })}
                    />
                    <Input
                      placeholder="R2 Account ID"
                      required
                      value={form.accountId}
                      onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    />
                    <Input
                      placeholder="Access Key ID"
                      required
                      value={form.accessKeyId}
                      onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Secret Access Key"
                      required
                      value={form.secretAccessKey}
                      onChange={(e) => setForm({ ...form, secretAccessKey: e.target.value })}
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Button type="submit" size="sm" disabled={connect.isPending}>
                        {connect.isPending && <Loader2 className="size-4 animate-spin" />}
                        Test & connect
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowConnectForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Credentials are encrypted at rest and never sent back to the browser.
                    </p>
                  </form>
                )}

                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                  <div>
                    <p className="text-sm font-medium">Cloudinary</p>
                    <p className="text-xs text-muted-foreground">
                      Coming soon — needs a signed-upload transport change
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    Not available
                  </Button>
                </div>
                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                  <div>
                    <p className="text-sm font-medium">Supabase Storage</p>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    Not available
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <div className="hidden md:block">
        <SiteFooter />
      </div>
      <MobileBottomNav />
    </div>
  );
}
