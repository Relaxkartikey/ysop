import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Cloud, LayoutGrid } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { UploadWidget } from "@/components/upload-widget";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Upload a File — YSOP",
  description:
    "Sign in with Google, upload any file, get a short share link, and let it delete itself after 24 hours to 10 days. Free forever.",
  openGraph: {
    title: "Upload a File — YSOP",
    description:
      "Upload a file, share a link, and it deletes itself. Free tool for developers and students.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function UploadPage() {
  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-2xl px-5 py-8 pb-28 md:py-16 md:pb-16">
        <UploadWidget />
        <div className="mt-5 hidden items-center justify-center gap-2 md:flex">
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
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <LayoutGrid className="size-4" />
              My Files
            </Link>
          </Button>
        </div>
      </main>
      <div className="hidden md:block">
        <SiteFooter />
      </div>
      <MobileBottomNav />
    </div>
  );
}
