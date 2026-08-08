import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About — YSOP",
  description: "Why YSOP exists, and who's behind it.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="label-caps">About</div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          Storage that stays out of your way
        </h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            YSOP started from a simple annoyance: sharing a file with someone shouldn&apos;t require
            an account for them, a subscription for you, or a dashboard full of settings neither of
            you asked for. Most tools either lock files behind logins the recipient doesn&apos;t
            want, or hand you a permanent link you never meant to keep around forever.
          </p>
          <p>
            The idea behind YSOP was to make the temporary case the default. Upload a file, pick
            when it should disappear, and get a link back immediately — no clutter, no surprise
            bill, no file sitting on a server six months after anyone needed it.
          </p>
          <p>
            As the tool grew, the same question kept coming up from developers: what if I want to
            keep control of the storage itself? That&apos;s what YSOP is for — connect your own
            Cloudflare R2 bucket and get the same upload, folder, and link workflow, just backed by
            infrastructure you already own.
          </p>
          <p>
            Today YSOP handles uploads with configurable expiry, folders, source and share links,
            folder downloads, and — for people who want more control — their own connected storage
            with permanent links. It&apos;s built to stay small and predictable rather than to keep
            bolting on features nobody asked for.
          </p>
        </div>

        <div className="panel mt-10 flex flex-wrap items-center gap-4 p-6">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Built by @relaxkartikey</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Developed under{" "}
              <a
                href="https://entospark.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                Entospark
              </a>
              .
            </p>
          </div>
          <a
            href="https://github.com/relaxkartikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground hover:underline"
          >
            GitHub →
          </a>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/upload">Try YSOP</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
