"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Upload,
  FolderOpen,
  Cloud,
  MoreHorizontal,
  Info,
  BookOpen,
  Tag,
  Shield,
  FileText,
  Github,
  Moon,
  Sun,
  LogOut,
  LogIn,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { GITHUB_REPO_URL } from "@/lib/site";

const PRIMARY_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/dashboard", label: "My Files", icon: FolderOpen },
  { href: "/settings/storage", label: "Storage", icon: Cloud },
];

const MORE_LINKS = [
  { href: "/about", label: "About", icon: Info },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/privacy", label: "Privacy", icon: Shield },
  { href: "/terms", label: "Terms", icon: FileText },
];

/** Bottom tab bar shown on mobile for the core app pages (dashboard, upload, settings). */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {PRIMARY_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}

        <Drawer>
          <DrawerTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
            >
              <MoreHorizontal className="size-5" />
              More
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>More</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <div className="grid grid-cols-2 gap-2">
                {MORE_LINKS.map((link) => (
                  <DrawerClose key={link.href} asChild>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-sm font-medium"
                    >
                      <link.icon className="size-4 text-muted-foreground" />
                      {link.label}
                    </Link>
                  </DrawerClose>
                ))}
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-sm font-medium"
                >
                  <Github className="size-4 text-muted-foreground" />
                  GitHub
                </a>
                <button
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-sm font-medium"
                >
                  {theme === "dark" ? (
                    <Sun className="size-4 text-muted-foreground" />
                  ) : (
                    <Moon className="size-4 text-muted-foreground" />
                  )}
                  Theme
                </button>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                {user ? (
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium text-destructive"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                ) : (
                  <DrawerClose asChild>
                    <Link
                      href="/auth"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium"
                    >
                      <LogIn className="size-4" /> Sign in
                    </Link>
                  </DrawerClose>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
