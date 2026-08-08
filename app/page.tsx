import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";

export const metadata: Metadata = {
  title: "YSOP — Your Storages at One Place for Developers & Professionals",
  description:
    "Free file storage and sharing for developers and professionals. Upload files, get source and share links, organize with folders, set automatic expiry, or connect your own Cloudflare R2 storage with Pro.",
  openGraph: {
    title: "YSOP — Your Storages at One Place for Developers & Professionals",
    description:
      "Free file storage and sharing for developers and professionals. Upload files, get source and share links, organize with folders, set automatic expiry, or connect your own Cloudflare R2 storage with Pro.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function Index() {
  return <HomeHero />;
}
