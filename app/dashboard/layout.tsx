import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My files — YSOP Dashboard",
  description:
    "Manage your temporary uploads: rename, replace, copy links and delete files before they expire.",
  openGraph: {
    title: "YSOP dashboard",
    description: "Manage your temporary uploads and share links in one place.",
    type: "website",
  },
  twitter: { card: "summary" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
