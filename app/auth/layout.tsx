import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — YSOP File Sharing",
  description:
    "Sign in with Google to keep up to 40 active uploads and manage them from your YSOP dashboard.",
  openGraph: {
    title: "Sign in to YSOP",
    description: "Google sign-in for a bigger upload limit and a file dashboard.",
    type: "website",
  },
  twitter: { card: "summary" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
