"use client";

import Link from "next/link";
import {
  Upload,
  Cloud,
  ArrowRight,
  Moon,
  Sun,
  User as UserIcon,
  LayoutGrid,
  LogOut,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteFooter } from "@/components/site-footer";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { YsopLogo } from "@/components/ysop-logo";
import { HomeHeroMockup } from "@/components/home-hero-mockup";
import { HomeProcess } from "@/components/home-process";
import { HomeByos } from "@/components/home-byos";
import { HomePricing } from "@/components/home-pricing";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";

const navLinks = [
  { href: "#byos", label: "What is YSOP?" },
  { href: "#how-it-works", label: "How it Works?" },
  { href: "#pricing", label: "Pricing" },
];

export function HomeHero() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen">
      <div className="sticky top-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-1 rounded-full border border-white/10 bg-[oklch(0.19_0.012_165)] px-2 py-2 shadow-[0_2px_6px_oklch(0.2_0.02_160_/_0.06),0_18px_40px_oklch(0.2_0.02_160_/_0.1)]">
        <Link href="/" className="flex items-center gap-2 rounded-full px-3 py-1.5">
          <YsopLogo className="size-6 rounded-md" />
          <span className="text-[13px] font-semibold tracking-tight text-white">YSOP</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggle}
          className="ml-1 flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account"
                className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <UserIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-xs text-muted-foreground">Profile</div>
                <div className="truncate text-sm font-medium text-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/upload">
                  <Upload className="size-4" /> Upload File
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <LayoutGrid className="size-4" /> My Files
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/storage">
                  <Cloud className="size-4" /> Storage Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs">
                  <BookOpen className="size-4" /> Help Docs
                </Link>
              </DropdownMenuItem>
              <SubscriptionDialog>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <CreditCard className="size-4" /> Subscription
                </DropdownMenuItem>
              </SubscriptionDialog>
              <InstallPwaButton />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            asChild
            size="sm"
            className="ml-1 rounded-full bg-emerald-400 text-[oklch(0.19_0.012_165)] hover:bg-emerald-300"
          >
            <Link href="/upload">Start uploading</Link>
          </Button>
        )}
      </div>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="grid-canvas pointer-events-none absolute inset-0 opacity-60"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pt-20 pb-16 lg:grid-cols-[1.15fr_1fr] lg:pt-28">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                Free file storage · YSOP ready
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                Your Files. <span className="font-serif italic text-primary">Your Storage.</span>{" "}
                Your Links.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                Upload files, get instant source and share links, organize them into folders, and
                choose when they expire — or connect your own Cloudflare R2 storage with Pro.
              </p>
              <p className="mt-2 max-w-lg text-xs text-muted-foreground/70">
                Free forever · 20 MB/file · 200 MB platform storage
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/upload">
                    Start uploading <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#how-it-works">How it works</Link>
                </Button>
              </div>
            </div>

            <div>
              <HomeHeroMockup />
            </div>
          </div>
        </section>

        <HomeByos />

        <HomeProcess />

        <HomePricing />
      </main>

      <div className="pb-20 md:pb-0">
        <SiteFooter />
      </div>
      <MobileBottomNav />
    </div>
  );
}
