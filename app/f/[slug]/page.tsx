import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicFileBySlug } from "@/server/files.server";
import { formatBytes } from "@/lib/format";
import { FilePageClient } from "./file-page-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const file = await publicFileBySlug(slug);
  return {
    title: file ? `${file.filename} — Download on YSOP` : "File — YSOP",
    description: file
      ? `Download ${file.filename} (${formatBytes(Number(file.size))}). This temporary link deletes itself automatically.`
      : "Temporary file download on YSOP.",
    openGraph: {
      title: file ? `Download ${file.filename}` : "Download file",
      description:
        "A temporary file shared with YSOP. The link expires and the file is deleted automatically.",
      type: "website",
    },
    twitter: { card: "summary" },
    robots: { index: false },
  };
}

export default async function FilePage({ params }: Props) {
  const { slug } = await params;
  const file = await publicFileBySlug(slug);
  if (!file) notFound();
  return <FilePageClient file={file} slug={slug} />;
}
