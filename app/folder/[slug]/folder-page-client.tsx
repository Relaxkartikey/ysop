"use client";

import { useState } from "react";
import { Copy, Download, FolderIcon, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CapsuleIconButton } from "@/components/capsule-icon-button";
import { getDownloadUrlAction } from "@/app/actions/files";
import { fileKind } from "@/lib/format";

type FolderFile = {
  slug: string;
  filename: string;
  mime_type: string;
  size: number;
  created_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  srcUrl: string | null;
};

function fileUrl(slug: string) {
  return typeof window === "undefined" ? `/f/${slug}` : `${window.location.origin}/f/${slug}`;
}

function folderUrl(slug: string) {
  return typeof window === "undefined"
    ? `/folder/${slug}`
    : `${window.location.origin}/folder/${slug}`;
}

export function FolderPageClient({
  folder,
  slug,
}: {
  folder: { name: string; files: FolderFile[] };
  slug: string;
}) {
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const download = async (file: FolderFile) => {
    setBusySlug(file.slug);
    try {
      const { url } = await getDownloadUrlAction({ slug: file.slug });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusySlug(null);
    }
  };

  const copy = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const copyTable = (kind: "source" | "share") => {
    const rows = folder.files
      .map((f) => {
        const link = kind === "source" ? f.srcUrl : fileUrl(f.slug);
        return link ? `${f.filename}\t${link}` : null;
      })
      .filter((row): row is string => row !== null);
    if (!rows.length) {
      toast.error(kind === "source" ? "No files have a source link" : "No files to copy links for");
      return;
    }
    void copy(
      rows.join("\n"),
      kind === "source" ? "Source links copied as a table" : "Share links copied as a table",
    );
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-primary">
              <FolderIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold tracking-tight">{folder.name}</h1>
              <p className="text-xs text-muted-foreground">
                {folder.files.length} file{folder.files.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => copyTable("source")}>
                <Link2 className="size-4" /> Copy source links
              </Button>
              <Button size="sm" variant="outline" onClick={() => copyTable("share")}>
                <Copy className="size-4" /> Copy share links
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(folderUrl(slug), "Folder link copied")}
              >
                <FolderIcon className="size-4" /> Copy folder link
              </Button>
            </div>
          </div>

          {folder.files.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              This folder is empty.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {folder.files.map((f) => (
                <li key={f.slug} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-soft font-mono text-[10px] font-semibold text-primary">
                    {fileKind(f.mime_type, f.filename)}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{f.filename}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {f.srcUrl ? (
                      <CapsuleIconButton
                        icon={Link2}
                        label="Copy source link"
                        onClick={() => copy(f.srcUrl!, "Source link copied")}
                      />
                    ) : (
                      <span className="flex size-8 items-center justify-center text-muted-foreground/30">
                        <Link2 className="size-4" />
                      </span>
                    )}
                    <CapsuleIconButton
                      icon={Copy}
                      label="Copy share link"
                      onClick={() => copy(fileUrl(f.slug), "Share link copied")}
                    />
                    <CapsuleIconButton
                      icon={busySlug === f.slug ? Loader2 : Download}
                      label="Download"
                      onClick={() => download(f)}
                      disabled={busySlug === f.slug}
                      className={busySlug === f.slug ? "[&_svg]:animate-spin" : undefined}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
