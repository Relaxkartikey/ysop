import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicFolderBySlug } from "@/server/files.server";
import { FolderPageClient } from "./folder-page-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const folder = await publicFolderBySlug(slug);
  return {
    title: folder ? `${folder.name} — Shared folder on YSOP` : "Folder — YSOP",
    description: folder
      ? `${folder.files.length} file${folder.files.length === 1 ? "" : "s"} shared via YSOP.`
      : "Shared folder on YSOP.",
    robots: { index: false },
  };
}

export default async function FolderPage({ params }: Props) {
  const { slug } = await params;
  const folder = await publicFolderBySlug(slug);
  if (!folder) notFound();
  return <FolderPageClient folder={folder} slug={slug} />;
}
