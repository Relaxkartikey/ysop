"use client";

import { Cloud, HardDrive } from "lucide-react";

const NODES = [
  { name: "Platform Storage", meta: "Free · 200 MB included", connected: false },
  { name: "Cloudflare R2 (1)", meta: "Connected · Pro", connected: true },
  { name: "Cloudflare R2 (2)", meta: "Connected · Pro", connected: true },
  { name: "Supabase Storage (3)", meta: "Connected · Pro", connected: true },
];

/** Storage-nodes preview card. Decorative only. */
export function HomeHeroMockup() {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.19_0.012_165)] shadow-[0_2px_6px_oklch(0.2_0.02_160_/_0.06),0_18px_40px_oklch(0.2_0.02_160_/_0.1)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <span className="text-[13px] font-semibold tracking-tight text-white/90">Your storage</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div className="space-y-2.5 p-5">
        {NODES.map((node) => (
          <div
            key={node.name}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5"
          >
            <span
              className={
                node.connected
                  ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
                  : "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60"
              }
            >
              {node.connected ? <Cloud className="size-4" /> : <HardDrive className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white/90">{node.name}</div>
              <div className="text-xs text-white/50">{node.meta}</div>
            </div>
            {node.connected && <span className="size-2 shrink-0 rounded-full bg-emerald-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}
