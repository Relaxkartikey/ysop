import Link from "next/link";
import { Github, Star } from "lucide-react";
import { YsopLogo } from "@/components/ysop-logo";
import { GITHUB_REPO_URL } from "@/lib/site";

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2">
              <YsopLogo className="size-6" />
              <span className="text-sm font-semibold tracking-tight">YSOP</span>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Your Storage at One Place. Upload files, get instant links, and let them expire
              automatically — or bring your own Cloudflare R2 storage.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Github className="size-3.5" />
            Star on GitHub
            <Star className="size-3.5" />
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground">
          <p>
            Built by{" "}
            <a
              href="https://github.com/relaxkartikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              @relaxkartikey
            </a>{" "}
            at{" "}
            <a
              href="https://entospark.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Entospark
            </a>
          </p>
          <p>&copy; {new Date().getFullYear()} YSOP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
