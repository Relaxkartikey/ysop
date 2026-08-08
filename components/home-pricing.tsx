import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const FREE_FEATURES = [
  "20 MB/file",
  "200 MB platform storage",
  "40 active files",
  "24h → 10d expiry",
  "Folders",
  "Source & share links",
  "Direct uploads",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Cloudflare R2 via YSOP",
  "Permanent links",
  "Personal storage management",
  "Storage selector",
];

export function HomePricing() {
  return (
    <section id="pricing" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Simple pricing
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Free vs Pro</h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="panel fade-in-up flex flex-col p-7">
          <h3 className="text-lg font-semibold">Free</h3>
          <p className="mt-1 text-sm text-muted-foreground">Platform storage, ready to go.</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/upload">Start for free</Link>
          </Button>
        </div>

        <div
          className="fade-in-up flex flex-col rounded-2xl border border-primary/40 bg-success-soft p-7 shadow-[var(--shadow-card)]"
          style={{ animationDelay: "80ms" }}
        >
          <h3 className="text-lg font-semibold text-accent-foreground">Pro</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything in Free, plus your own storage.
          </p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6">
            <Link href="/checkout">Go Pro</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
