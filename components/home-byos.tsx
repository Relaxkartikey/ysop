import {
  Cloud,
  HardDrive,
  Zap,
  Link2,
  Crown,
  Layers,
  FileText,
  Trash2,
  Copy,
  QrCode,
} from "lucide-react";

const HIGHLIGHTS = [
  { icon: Cloud, label: "Your own R2 storage" },
  { icon: Layers, label: "Connect multiple buckets" },
  { icon: HardDrive, label: "Your own storage quota" },
  { icon: Zap, label: "Direct uploads" },
  { icon: Link2, label: "Source & share links" },
  { icon: Crown, label: "Pro feature" },
];

const CARD_ACTIONS = [
  { icon: Trash2, label: "Delete" },
  { icon: Copy, label: "Copy" },
  { icon: Link2, label: "Link" },
  { icon: QrCode, label: "QR" },
];

export function HomeByos() {
  return (
    <section id="byos" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div className="panel fade-in-up overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
            <div className="p-8 sm:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                YSOP — Your Storages at One Place
              </span>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Your storage. Our workflow.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Connect your own Cloudflare R2 buckets and manage files through the same workflow.
              </p>

              <div className="mt-6 hidden flex-wrap gap-2 md:flex">
                {HIGHLIGHTS.map((h) => (
                  <span
                    key={h.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-medium text-accent-foreground"
                  >
                    <h.icon className="size-3.5" />
                    {h.label}
                  </span>
                ))}
              </div>

              <p className="mt-6 text-sm font-medium text-foreground">
                Use our storage for free. Connect yours when you need it.
              </p>
            </div>

            <div className="flex items-center justify-center border-t border-border bg-surface p-8 lg:border-t-0 lg:border-l">
              <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-end gap-1 border-b border-border px-3 py-2">
                  {CARD_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      aria-label={action.label}
                      title={action.label}
                      className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <action.icon className="size-3.5" />
                    </button>
                  ))}
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-primary">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">brief.pdf</div>
                      <div className="text-xs text-muted-foreground">
                        2.4 MB · uploaded just now
                      </div>
                    </div>
                    <div className="text-right font-mono text-sm tabular-nums text-primary">
                      02:59:43
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <HardDrive className="size-3.5" />
                    Platform Storage
                  </div>

                  <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-3.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Share link
                      </div>
                      <code className="mt-0.5 block truncate font-mono text-xs text-foreground">
                        example.com/f/z9x3kq1
                      </code>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Direct source link
                      </div>
                      <code className="mt-0.5 block truncate font-mono text-xs text-foreground">
                        example.com/z9x3kq1/brief.pdf
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
