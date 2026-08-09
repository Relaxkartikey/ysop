"use client";

import Link from "next/link";
import {
  Moon,
  Sun,
  LayoutGrid,
  LogOut,
  Upload,
  Cloud,
  User as UserIcon,
  Github,
  CreditCard,
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
import { YsopLogo } from "@/components/ysop-logo";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/hooks/useAuth";
import { GITHUB_REPO_URL } from "@/lib/site";

export function SiteHeader() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <YsopLogo className="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">YSOP</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" asChild>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
            >
              <Github className="size-4" />
            </a>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
                  <UserIcon className="size-4" />
                </Button>
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
            <Button asChild size="sm">
              <Link href="/auth">Sign in</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
