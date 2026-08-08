"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2, Copy, QrCode, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDownloadUrlAction } from "@/app/actions/files";
import { formatBytes, formatDate, timeRemaining, fileKind } from "@/lib/format";

type FileMeta = {
  filename: string;
  mime_type: string;
  size: number;
  downloads: number;
  created_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  srcUrl: string | null;
};

export function FilePageClient({ file, slug }: { file: FileMeta; slug: string }) {
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { url } = await getDownloadUrlAction({ slug });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const openQr = async () => {
    setQrOpen(true);
    const QRCode = (await import("qrcode")).default;
    setQr(await QRCode.toDataURL(window.location.href, { margin: 1, width: 480 }));
  };

  const rows = [
    { label: "File name", value: file.filename },
    { label: "Size", value: formatBytes(Number(file.size)) },
    { label: "Type", value: file.mime_type },
    { label: "Uploaded", value: formatDate(file.created_at) },
    {
      label: "Expires",
      value: file.is_permanent ? "Never (permanent)" : timeRemaining(file.expires_at!),
    },
    { label: "Downloads", value: String(file.downloads) },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-16">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{file.filename}</h1>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
              {file.is_permanent ? "Permanent" : timeRemaining(file.expires_at!)}
            </span>
          </div>

          <div className="flex items-center gap-4 border-b border-border px-5 py-6">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-success-soft font-mono text-xs font-semibold text-primary">
              {fileKind(file.mime_type, file.filename)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Ready to download</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(Number(file.size))} ·{" "}
                {file.is_permanent ? "kept permanently" : "deletes automatically on expiry"}
              </p>
            </div>
          </div>

          <dl className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3">
                <dt className="label-caps">{r.label}</dt>
                <dd className="truncate text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-2 gap-2 border-t border-border bg-secondary/40 px-5 py-4">
            <Button className="min-w-0" onClick={download} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span className="truncate">Download</span>
            </Button>
            <Button
              className="min-w-0"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied");
              }}
            >
              <Copy className="size-4" />
              <span className="truncate">Share link</span>
            </Button>
            {file.srcUrl && (
              <Button
                className="min-w-0"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(file.srcUrl!);
                  toast.success("Source link copied");
                }}
              >
                <Link2 className="size-4" />
                <span className="truncate">Source link</span>
              </Button>
            )}
            <Button className="min-w-0" variant="outline" onClick={openQr}>
              <QrCode className="size-4" />
              <span className="truncate">QR code</span>
            </Button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Need to share something of your own?{" "}
          <Link href="/upload" className="font-medium text-foreground underline underline-offset-4">
            Upload a file free
          </Link>
        </p>
      </main>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to download</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center pb-3">
            {qr ? (
              <img
                src={qr}
                alt="QR code for this download link"
                className="size-56 rounded-xl border border-border"
              />
            ) : (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
