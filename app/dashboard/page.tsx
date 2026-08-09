"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArchiveIcon,
  Archive,
  ChevronRight,
  Cloud,
  Copy,
  BookOpen,
  Download,
  File as FileIcon,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  LayoutList,
  Link2,
  Loader2,
  LogIn,
  MoreHorizontal,
  Music,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  SortAsc,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/hooks/useAuth";
import { formatBytes, formatDate, timeRemaining } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { withAuth } from "@/lib/call-action";
import { cn } from "@/lib/utils";
import {
  listFilesAction,
  renameFileAction,
  deleteFileAction,
  getOwnedDownloadUrlAction,
  getUsageAction,
  listFoldersAction,
  createFolderAction,
  renameFolderAction,
  deleteFolderAction,
  moveFileAction,
  moveFilesAction,
  moveFolderAction,
  setPermanentStatusAction,
} from "@/app/actions/files";

type FileRow = {
  id: string;
  slug: string;
  filename: string;
  mime_type: string;
  size: number;
  downloads: number;
  created_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  srcUrl: string | null;
  folder_id: string | null;
  storageLabel: string;
};

type FolderRow = { id: string; name: string; slug: string; parent_folder_id: string | null };

const MAX_FOLDER_DEPTH = 5;

type ViewMode = "default" | "links";
const VIEW_STORAGE_KEY = "ysop:dashboard-view";

function folderShareUrl(slug: string) {
  return typeof window === "undefined"
    ? `/folder/${slug}`
    : `${window.location.origin}/folder/${slug}`;
}

type SortKey =
  | "name-asc"
  | "name-desc"
  | "date-newest"
  | "date-oldest"
  | "size-largest"
  | "size-smallest"
  | "expiry-soonest";

const SORT_LABELS: Record<SortKey, string> = {
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  "date-newest": "Date uploaded (newest)",
  "date-oldest": "Date uploaded (oldest)",
  "size-largest": "Size (largest)",
  "size-smallest": "Size (smallest)",
  "expiry-soonest": "Expiry (soonest)",
};

function shareUrl(slug: string) {
  return typeof window === "undefined" ? `/f/${slug}` : `${window.location.origin}/f/${slug}`;
}

const CODE_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "rs",
  "rb",
  "php",
  "json",
  "html",
  "css",
  "scss",
  "sh",
  "yml",
  "yaml",
  "sql",
]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]);
const SPREADSHEET_EXTENSIONS = new Set(["csv", "xls", "xlsx"]);
const DOCUMENT_EXTENSIONS = new Set(["doc", "docx", "txt", "md", "rtf"]);

/** Icon for a file's type; falls back to a generic file icon for anything unrecognized. */
function fileTypeIcon(mimeType: string, filename: string): LucideIcon {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType === "application/pdf") return FileText;
  if (ARCHIVE_EXTENSIONS.has(ext)) return Archive;
  if (SPREADSHEET_EXTENSIONS.has(ext)) return FileSpreadsheet;
  if (CODE_EXTENSIONS.has(ext)) return FileCode2;
  if (DOCUMENT_EXTENSIONS.has(ext)) return FileText;
  return FileIcon;
}

function sortFiles(files: FileRow[], sort: SortKey): FileRow[] {
  const sorted = [...files];
  switch (sort) {
    case "name-asc":
      return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    case "name-desc":
      return sorted.sort((a, b) => b.filename.localeCompare(a.filename));
    case "date-newest":
      return sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    case "date-oldest":
      return sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    case "size-largest":
      return sorted.sort((a, b) => Number(b.size) - Number(a.size));
    case "size-smallest":
      return sorted.sort((a, b) => Number(a.size) - Number(b.size));
    case "expiry-soonest":
      return sorted.sort((a, b) => {
        const at = a.is_permanent || !a.expires_at ? Infinity : +new Date(a.expires_at);
        const bt = b.is_permanent || !b.expires_at ? Infinity : +new Date(b.expires_at);
        return at - bt;
      });
  }
}

/** Page numbers to render, collapsing long runs into a single "…" gap around the current page. */
function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

function LinkCell({ value, onCopy }: { value: string | null; onCopy: (value: string) => void }) {
  if (!value) return <span className="text-sm text-muted-foreground/50">—</span>;
  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      title={value}
      className="block w-44 truncate rounded px-1.5 py-1 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {value}
    </button>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const staticPlan = PLANS.free;
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("date-newest");
  const [zipping, setZipping] = useState(false);
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<FolderRow | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("default");
  const [showDepthAlert, setShowDepthAlert] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "default" || stored === "links") setViewMode(stored);
  }, []);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  };

  const enabled = !loading && !!user;
  const query = useQuery({
    queryKey: ["files", user?.id],
    enabled,
    queryFn: async () => (await listFilesAction(await withAuth({}))) as unknown as FileRow[],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["files"] });

  const usage = useQuery({
    queryKey: ["usage", user?.id],
    enabled,
    queryFn: async () => getUsageAction(await withAuth({})),
  });
  const plan = {
    ...staticPlan,
    maxActiveFiles: usage.data?.capabilities.maxActiveFiles ?? staticPlan.maxActiveFiles,
    canFolders: usage.data?.capabilities.canFolders ?? staticPlan.canFolders,
    canPermanentLinks: usage.data?.capabilities.canPermanentLinks ?? staticPlan.canPermanentLinks,
  };
  const fallbackExpiryHours = plan.expiryOptions.find((o) => Number.isFinite(o.hours))?.hours ?? 24;

  const foldersQuery = useQuery({
    queryKey: ["folders", user?.id ?? null],
    enabled: !loading && !!user && plan.canFolders,
    queryFn: async () => (await listFoldersAction(await withAuth({}))) as unknown as FolderRow[],
  });
  const folders = useMemo(
    () => [...(foldersQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [foldersQuery.data],
  );
  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null;

  const folderDepthMap = useMemo(() => {
    const map = new Map<string, number>();
    const depthOf = (id: string): number => {
      if (map.has(id)) return map.get(id)!;
      const f = folders.find((x) => x.id === id);
      const d = f?.parent_folder_id ? depthOf(f.parent_folder_id) + 1 : 1;
      map.set(id, d);
      return d;
    };
    folders.forEach((f) => depthOf(f.id));
    return map;
  }, [folders]);

  const currentDepth = currentFolderId ? (folderDepthMap.get(currentFolderId) ?? 1) : 0;
  const atMaxFolderDepth = currentDepth >= MAX_FOLDER_DEPTH;

  const folderChildrenMap = useMemo(() => {
    const map = new Map<string | null, FolderRow[]>();
    for (const f of folders) {
      const key = f.parent_folder_id;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return map;
  }, [folders]);

  /** Folders in tree order (parents before children) with indent depth, for hierarchy-aware pickers. */
  const orderedFolders = useMemo(() => {
    const result: { folder: FolderRow; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const f of folderChildrenMap.get(parentId) ?? []) {
        result.push({ folder: f, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  }, [folderChildrenMap]);

  const descendantsOf = (id: string): Set<string> => {
    const result = new Set<string>();
    const stack = [...(folderChildrenMap.get(id) ?? [])];
    while (stack.length) {
      const f = stack.pop()!;
      result.add(f.id);
      stack.push(...(folderChildrenMap.get(f.id) ?? []));
    }
    return result;
  };

  const subtreeHeightOf = (id: string): number => {
    const children = folderChildrenMap.get(id) ?? [];
    if (!children.length) return 1;
    return 1 + Math.max(...children.map((c) => subtreeHeightOf(c.id)));
  };

  /** Whether moving `movingIds` (folders) into `targetId` (null = root) would break nesting rules. */
  const isFolderMoveDisabled = (targetId: string | null, movingIds: Set<string>): boolean => {
    for (const id of movingIds) {
      if (targetId === id) return true;
      const folder = folders.find((f) => f.id === id);
      if ((folder?.parent_folder_id ?? null) === targetId) return true; // already there
      if (targetId && descendantsOf(id).has(targetId)) return true; // would create a cycle
      const targetDepth = targetId ? (folderDepthMap.get(targetId) ?? 1) : 0;
      if (targetDepth + subtreeHeightOf(id) > MAX_FOLDER_DEPTH) return true;
    }
    return false;
  };

  const breadcrumb = useMemo(() => {
    const path: FolderRow[] = [];
    let cur = currentFolder;
    while (cur) {
      path.unshift(cur);
      cur = cur.parent_folder_id
        ? (folders.find((f) => f.id === cur!.parent_folder_id) ?? null)
        : null;
    }
    return path;
  }, [currentFolder, folders]);

  const createFolder = useMutation({
    mutationFn: async (name: string) =>
      createFolderAction(await withAuth({ name, parentFolderId: currentFolderId })),
    onSuccess: () => {
      setNewFolderName("");
      qc.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created");
    },
    onError: (e: Error) => {
      if (e.message.includes("nested")) setShowDepthAlert(true);
      else toast.error(e.message);
    },
  });

  const renameFolder = useMutation({
    mutationFn: async (v: { id: string; name: string }) =>
      renameFolderAction(await withAuth({ ...v })),
    onSuccess: () => {
      setEditingFolder(null);
      qc.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder renamed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFolder = useMutation({
    mutationFn: async (v: { id: string; mode: "move-to-root" | "delete-files" }) =>
      deleteFolderAction(await withAuth({ ...v })),
    onSuccess: () => {
      setDeletingFolder(null);
      setCurrentFolderId(null);
      qc.invalidateQueries({ queryKey: ["folders"] });
      invalidate();
      toast.success("Folder deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveFile = useMutation({
    mutationFn: async (v: { id: string; folderId: string | null }) =>
      moveFileAction(await withAuth({ ...v })),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const moveFiles = useMutation({
    mutationFn: async (v: { ids: string[]; folderId: string | null }) =>
      moveFilesAction(await withAuth({ ...v })),
    onSuccess: () => {
      setSelected(new Set());
      invalidate();
      toast.success("Moved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveFolder = useMutation({
    mutationFn: async (v: { id: string; folderId: string | null }) =>
      moveFolderAction(await withAuth({ ...v })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder moved");
    },
    onError: (e: Error) => {
      if (e.message.includes("nested")) setShowDepthAlert(true);
      else toast.error(e.message);
    },
  });

  const togglePermanent = useMutation({
    mutationFn: async (v: { id: string; isPermanent: boolean; expiryHours: number | null }) =>
      setPermanentStatusAction(await withAuth({ ...v })),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async (v: { id: string; filename: string }) =>
      renameFileAction(await withAuth({ ...v })),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast.success("Renamed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFileAction(await withAuth({ id })),
    onError: (e: Error) => toast.error(e.message),
  });

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const toggleSelected = (id: string) => {
    if (selectedFolders.size > 0) {
      toast.error("You can't select files and folders at the same time.");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFolderSelected = (id: string) => {
    if (selected.size > 0) {
      toast.error("You can't select files and folders at the same time.");
      return;
    }
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFiles = query.data ?? [];

  const { folderLatestDate, folderTotalSize, folderSoonestExpiry, folderHasFiles } = useMemo(() => {
    const files = query.data ?? [];
    const latest = new Map<string, string>();
    const size = new Map<string, number>();
    const soonest = new Map<string, string>();
    const hasFiles = new Set<string>();
    for (const f of files) {
      if (!f.folder_id) continue;
      hasFiles.add(f.folder_id);
      const currentLatest = latest.get(f.folder_id);
      if (!currentLatest || +new Date(f.created_at) > +new Date(currentLatest)) {
        latest.set(f.folder_id, f.created_at);
      }
      size.set(f.folder_id, (size.get(f.folder_id) ?? 0) + Number(f.size));
      if (!f.is_permanent && f.expires_at) {
        const currentSoonest = soonest.get(f.folder_id);
        if (!currentSoonest || +new Date(f.expires_at) < +new Date(currentSoonest)) {
          soonest.set(f.folder_id, f.expires_at);
        }
      }
    }
    return {
      folderLatestDate: latest,
      folderTotalSize: size,
      folderSoonestExpiry: soonest,
      folderHasFiles: hasFiles,
    };
  }, [query.data]);

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  const { visibleFolders, visibleFiles } = useMemo(() => {
    const files = query.data ?? [];
    if (searching) {
      return {
        visibleFolders: folders.filter((f) => f.name.toLowerCase().includes(q)),
        visibleFiles: sortFiles(
          files.filter((f) => f.filename.toLowerCase().includes(q)),
          sort,
        ),
      };
    }
    return {
      visibleFolders: folders.filter((f) => f.parent_folder_id === currentFolderId),
      visibleFiles: sortFiles(
        files.filter((f) => f.folder_id === currentFolderId),
        sort,
      ),
    };
  }, [query.data, folders, sort, currentFolderId, searching, q]);

  const visibleIds = visibleFiles.map((f) => f.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedFiles = allFiles.filter((f) => selected.has(f.id));
  const selectedFolderRows = folders.filter((f) => selectedFolders.has(f.id));

  // Pagination happens entirely over the already-fetched list — no extra DB round trips per page.
  const PAGE_SIZE = 15;
  const totalRows = visibleFolders.length + visibleFiles.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [currentFolderId, searching, q, sort, viewMode]);

  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageFolders = visibleFolders.slice(pageStart, pageStart + PAGE_SIZE);
  const pageFiles = visibleFiles.slice(
    Math.max(0, pageStart - visibleFolders.length),
    Math.max(0, pageStart + PAGE_SIZE - visibleFolders.length),
  );

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    await Promise.all(ids.map((id) => remove.mutateAsync(id)));
    setSelected(new Set());
    invalidate();
    toast.success(`${ids.length} file${ids.length === 1 ? "" : "s"} deleted`);
  };

  const bulkCopyShareLinks = () => {
    if (!selectedFiles.length) return;
    const text = selectedFiles.map((f) => `${f.filename}: ${shareUrl(f.slug)}`).join("\n");
    void copyText(text, "Share links copied");
  };

  const bulkDeleteFolders = async () => {
    const ids = [...selectedFolders];
    if (!ids.length) return;
    await Promise.all(
      ids.map((id) => deleteFolder.mutateAsync({ id, mode: "move-to-root" as const })),
    );
    setSelectedFolders(new Set());
    toast.success(`${ids.length} folder${ids.length === 1 ? "" : "s"} deleted`);
  };

  const bulkCopyFolderShareLinks = () => {
    if (!selectedFolderRows.length) return;
    const text = selectedFolderRows.map((f) => `${f.name}: ${folderShareUrl(f.slug)}`).join("\n");
    void copyText(text, "Share links copied");
  };

  const bulkMoveFolders = async (targetFolderId: string | null) => {
    const ids = [...selectedFolders];
    if (!ids.length) return;
    await Promise.all(ids.map((id) => moveFolder.mutateAsync({ id, folderId: targetFolderId })));
    setSelectedFolders(new Set());
  };

  const bulkDownloadZip = async () => {
    if (!selectedFiles.length) return;
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        selectedFiles.map(async (f) => {
          const { url } = await getOwnedDownloadUrlAction(await withAuth({ id: f.id }));
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch ${f.filename}`);
          zip.file(f.filename, await res.blob());
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ysop-files.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zip download failed");
    } finally {
      setZipping(false);
    }
  };

  const renderFileActions = (f: FileRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={async () => {
            const { url } = await getOwnedDownloadUrlAction(await withAuth({ id: f.id }));
            window.location.href = url;
          }}
        >
          <Download className="size-4" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyText(shareUrl(f.slug), "Share link copied")}>
          <Copy className="size-4" /> Copy share link
        </DropdownMenuItem>
        {f.srcUrl && (
          <DropdownMenuItem onClick={() => copyText(f.srcUrl!, "Source link copied")}>
            <Link2 className="size-4" /> Copy source link
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            setEditing(f.id);
            setDraft(f.filename);
          }}
        >
          <Pencil className="size-4" /> Rename
        </DropdownMenuItem>
        {plan.canFolders && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="size-4" /> Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={f.folder_id ?? ""}
                onValueChange={(v) => moveFile.mutate({ id: f.id, folderId: v || null })}
              >
                <DropdownMenuRadioItem value="">Root</DropdownMenuRadioItem>
                {orderedFolders.map(({ folder, depth }) => (
                  <DropdownMenuRadioItem
                    key={folder.id}
                    value={folder.id}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  >
                    {folder.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {plan.canPermanentLinks && (
          <DropdownMenuItem
            disabled={togglePermanent.isPending}
            onClick={() =>
              togglePermanent.mutate({
                id: f.id,
                isPermanent: !f.is_permanent,
                expiryHours: f.is_permanent ? fallbackExpiryHours : null,
              })
            }
          >
            <InfinityIcon className="size-4" />
            {f.is_permanent ? "Make temporary" : "Make permanent"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => remove.mutate(f.id, { onSuccess: () => invalidate() })}
        >
          <Trash2 className="size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!loading && !user) {
    return (
      <div className="min-h-screen">
        <div className="hidden md:block">
          <SiteHeader />
        </div>
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 pt-24 pb-28 text-center md:pb-24">
          <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-primary">
            <LogIn className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">Sign in to view your dashboard</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your files, folders, and links are tied to your account.
            </p>
          </div>
          <Button asChild size="lg" className="mt-1">
            <Link href="/auth">
              <LogIn className="size-4" /> Sign in with Google
            </Link>
          </Button>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-7xl px-5 py-6 pb-28 md:py-12 md:pb-12">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My files</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button asChild variant="outline" size="sm">
              <Link href="/docs">
                <BookOpen className="size-4" />
                Help Docs
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/storage">
                <Cloud className="size-4" />
                Storage Settings
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/upload">
                <Plus className="size-4" />
                New Upload
              </Link>
            </Button>
          </div>
        </div>

        <div className="panel mt-8 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {selected.size > 0 ? (
                <>
                  <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
                    {selected.size} Selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={zipping}>
                        {zipping ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="size-4" />
                        )}
                        Bulk actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onClick={bulkDownloadZip}>
                        <ArchiveIcon className="size-4" /> Download zip
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={bulkCopyShareLinks}>
                        <Copy className="size-4" /> Copy links
                      </DropdownMenuItem>
                      {plan.canFolders && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderInput className="size-4" /> Move to
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-52">
                            <DropdownMenuItem
                              onClick={() =>
                                moveFiles.mutate({ ids: [...selected], folderId: null })
                              }
                            >
                              Root
                            </DropdownMenuItem>
                            {orderedFolders.map(({ folder, depth }) => (
                              <DropdownMenuItem
                                key={folder.id}
                                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                onClick={() =>
                                  moveFiles.mutate({ ids: [...selected], folderId: folder.id })
                                }
                              >
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={bulkDelete}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="mx-1 h-5 w-px bg-border" />
                </>
              ) : selectedFolders.size > 0 ? (
                <>
                  <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
                    {selectedFolders.size} Selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="size-4" />
                        Bulk actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onClick={bulkCopyFolderShareLinks}>
                        <Copy className="size-4" /> Copy links
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <FolderInput className="size-4" /> Move to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          <DropdownMenuItem
                            disabled={isFolderMoveDisabled(null, selectedFolders)}
                            onClick={() => bulkMoveFolders(null)}
                          >
                            Root
                          </DropdownMenuItem>
                          {orderedFolders
                            .filter(({ folder }) => !selectedFolders.has(folder.id))
                            .map(({ folder, depth }) => (
                              <DropdownMenuItem
                                key={folder.id}
                                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                disabled={isFolderMoveDisabled(folder.id, selectedFolders)}
                                onClick={() => bulkMoveFolders(folder.id)}
                              >
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={bulkDeleteFolders}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="mx-1 h-5 w-px bg-border" />
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(null)}
                    className={cn(
                      "text-sm font-medium",
                      currentFolder
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-foreground",
                    )}
                  >
                    My files
                  </button>
                  {breadcrumb.map((folder, i) => (
                    <span key={folder.id} className="flex items-center gap-1.5">
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(folder.id)}
                        className={cn(
                          "text-sm font-medium",
                          i === breadcrumb.length - 1
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {folder.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files & folders"
                  className="h-8 w-48 pl-8"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SortAsc className="size-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <DropdownMenuRadioItem key={key} value={key}>
                        {key.endsWith("desc") || key === "size-largest" ? (
                          <ArrowDownAZ className="size-3.5" />
                        ) : (
                          <ArrowUpAZ className="size-3.5" />
                        )}
                        {SORT_LABELS[key]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {plan.canFolders &&
                (atMaxFolderDepth ? (
                  <Button variant="outline" size="sm" onClick={() => setShowDepthAlert(true)}>
                    <FolderPlus className="size-4" />
                    New folder
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FolderPlus className="size-4" />
                        New folder
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <form
                        className="flex items-center gap-1.5 p-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newFolderName.trim()) createFolder.mutate(newFolderName);
                        }}
                      >
                        <Input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name"
                          className="h-8"
                          autoFocus
                        />
                        <Button type="submit" size="sm" disabled={createFolder.isPending}>
                          <Plus className="size-4" />
                        </Button>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}

              <div className="flex items-center rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => changeView("default")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "default"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Rows3 className="size-3.5" /> Default
                </button>
                <button
                  type="button"
                  onClick={() => changeView("links")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "links"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutList className="size-3.5" /> Links
                </button>
              </div>
            </div>
          </div>

          {query.isPending || !enabled ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <p className="text-sm font-medium">
                {searching
                  ? "No matches"
                  : currentFolder
                    ? "This folder is empty"
                    : "No active uploads"}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {searching
                  ? "Try a different search term."
                  : "Files you upload will appear here until they expire."}
              </p>
              {!searching && !currentFolder && (
                <Button asChild className="mt-5">
                  <Link href="/upload">Upload your first file</Link>
                </Button>
              )}
            </div>
          ) : viewMode === "links" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? new Set(visibleIds) : new Set())
                      }
                      aria-label="Select all files"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Source Link</TableHead>
                  <TableHead>Share Link</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageFolders.map((folder) => (
                  <TableRow
                    key={folder.id}
                    data-state={selectedFolders.has(folder.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedFolders.has(folder.id)}
                        onCheckedChange={() => toggleFolderSelected(folder.id)}
                        aria-label={`Select ${folder.name}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentFolderId(folder.id);
                          setSearch("");
                        }}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                      >
                        <Folder className="size-4 shrink-0 text-primary" />
                        <span className="truncate text-sm font-medium">{folder.name}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Folder className="size-3" /> Folder
                      </span>
                    </TableCell>
                    <TableCell>
                      <LinkCell
                        value={folderShareUrl(folder.slug)}
                        onCopy={(v) => copyText(v, "Folder link copied")}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setCurrentFolderId(folder.id)}>
                            <FolderInput className="size-4" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              copyText(folderShareUrl(folder.slug), "Folder link copied")
                            }
                          >
                            <Copy className="size-4" /> Copy share link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingFolder(folder.id);
                              setFolderDraft(folder.name);
                            }}
                          >
                            <Pencil className="size-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FolderInput className="size-4" /> Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-56">
                              <DropdownMenuItem
                                disabled={isFolderMoveDisabled(null, new Set([folder.id]))}
                                onClick={() => moveFolder.mutate({ id: folder.id, folderId: null })}
                              >
                                Root
                              </DropdownMenuItem>
                              {orderedFolders
                                .filter(({ folder: f }) => f.id !== folder.id)
                                .map(({ folder: f, depth }) => (
                                  <DropdownMenuItem
                                    key={f.id}
                                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                    disabled={isFolderMoveDisabled(f.id, new Set([folder.id]))}
                                    onClick={() =>
                                      moveFolder.mutate({ id: folder.id, folderId: f.id })
                                    }
                                  >
                                    {f.name}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingFolder(folder)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {pageFiles.map((f) => {
                  const Icon = fileTypeIcon(f.mime_type, f.filename);
                  return (
                    <TableRow key={f.id} data-state={selected.has(f.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(f.id)}
                          onCheckedChange={() => toggleSelected(f.id)}
                          aria-label={`Select ${f.filename}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex min-w-0 items-start gap-2">
                          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium">
                            {f.filename}
                          </span>
                          <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {f.storageLabel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LinkCell
                          value={f.srcUrl}
                          onCopy={(v) => copyText(v, "Source link copied")}
                        />
                      </TableCell>
                      <TableCell>
                        <LinkCell
                          value={shareUrl(f.slug)}
                          onCopy={(v) => copyText(v, "Share link copied")}
                        />
                      </TableCell>
                      <TableCell>{renderFileActions(f)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? new Set(visibleIds) : new Set())
                      }
                      aria-label="Select all files"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date uploaded</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageFolders.map((folder) => (
                  <TableRow
                    key={folder.id}
                    className="cursor-pointer"
                    data-state={selectedFolders.has(folder.id) ? "selected" : undefined}
                    onClick={() => {
                      setCurrentFolderId(folder.id);
                      setSearch("");
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedFolders.has(folder.id)}
                        onCheckedChange={() => toggleFolderSelected(folder.id)}
                        aria-label={`Select ${folder.name}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      {editingFolder === folder.id ? (
                        <form
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                          onSubmit={(e) => {
                            e.preventDefault();
                            renameFolder.mutate({ id: folder.id, name: folderDraft });
                          }}
                        >
                          <Input
                            value={folderDraft}
                            onChange={(e) => setFolderDraft(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button type="submit" size="sm" disabled={renameFolder.isPending}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingFolder(null)}
                          >
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Folder className="size-4 shrink-0 text-primary" />
                          <span className="truncate text-sm font-medium">{folder.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {folderLatestDate.has(folder.id)
                        ? formatDate(folderLatestDate.get(folder.id)!)
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {folderTotalSize.has(folder.id)
                        ? formatBytes(folderTotalSize.get(folder.id)!)
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {folderSoonestExpiry.has(folder.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
                          {timeRemaining(folderSoonestExpiry.get(folder.id)!)}
                        </span>
                      ) : folderHasFiles.has(folder.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                          <InfinityIcon className="size-3" /> Permanent
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setCurrentFolderId(folder.id)}>
                            <FolderInput className="size-4" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              copyText(folderShareUrl(folder.slug), "Folder link copied")
                            }
                          >
                            <Copy className="size-4" /> Copy share link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingFolder(folder.id);
                              setFolderDraft(folder.name);
                            }}
                          >
                            <Pencil className="size-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FolderInput className="size-4" /> Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-56">
                              <DropdownMenuItem
                                disabled={isFolderMoveDisabled(null, new Set([folder.id]))}
                                onClick={() => moveFolder.mutate({ id: folder.id, folderId: null })}
                              >
                                Root
                              </DropdownMenuItem>
                              {orderedFolders
                                .filter(({ folder: f }) => f.id !== folder.id)
                                .map(({ folder: f, depth }) => (
                                  <DropdownMenuItem
                                    key={f.id}
                                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                    disabled={isFolderMoveDisabled(f.id, new Set([folder.id]))}
                                    onClick={() =>
                                      moveFolder.mutate({ id: folder.id, folderId: f.id })
                                    }
                                  >
                                    {f.name}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingFolder(folder)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {pageFiles.map((f) => {
                  const Icon = fileTypeIcon(f.mime_type, f.filename);
                  return (
                    <TableRow key={f.id} data-state={selected.has(f.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(f.id)}
                          onCheckedChange={() => toggleSelected(f.id)}
                          aria-label={`Select ${f.filename}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        {editing === f.id ? (
                          <form
                            className="flex items-center gap-1.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              rename.mutate({ id: f.id, filename: draft });
                            }}
                          >
                            <Input
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              maxLength={180}
                              className="h-8"
                              autoFocus
                            />
                            <Button type="submit" size="sm" disabled={rename.isPending}>
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(null)}
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => copyText(shareUrl(f.slug), "Share link copied")}
                            title="Click to copy share link"
                            className="flex min-w-0 items-start gap-2 text-left"
                          >
                            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium">
                              {f.filename}
                            </span>
                            <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {f.storageLabel}
                            </span>
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(f.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatBytes(Number(f.size))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                            f.is_permanent
                              ? "bg-primary/15 text-primary"
                              : "bg-success-soft text-accent-foreground",
                          )}
                        >
                          {f.is_permanent && <InfinityIcon className="size-3" />}
                          {f.is_permanent ? "Permanent" : timeRemaining(f.expires_at!)}
                        </span>
                      </TableCell>
                      <TableCell>{renderFileActions(f)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {pageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ),
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Page
                  <Select value={String(currentPage)} onValueChange={(v) => setPage(Number(v))}>
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  of {totalPages}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <AlertDialog
        open={!!deletingFolder}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deletingFolder?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              You can move its files to Root, or delete the folder and everything inside it. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() =>
                deletingFolder &&
                deleteFolder.mutate({ id: deletingFolder.id, mode: "move-to-root" })
              }
              disabled={deleteFolder.isPending}
            >
              Delete folder only
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deletingFolder &&
                deleteFolder.mutate({ id: deletingFolder.id, mode: "delete-files" })
              }
              disabled={deleteFolder.isPending}
            >
              Delete folder + files
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDepthAlert} onOpenChange={setShowDepthAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Folder nesting limit reached</AlertDialogTitle>
            <AlertDialogDescription>
              Folders can only be nested {MAX_FOLDER_DEPTH} levels deep. Move up a level or choose a
              different location to create a new folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDepthAlert(false)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </div>
  );
}
