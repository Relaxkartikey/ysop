import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getDocBySlug, getDocsList } from "@/lib/docs.server";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getDocsList().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  return { title: doc ? `${doc.title} — YSOP Docs` : "Docs — YSOP" };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  return (
    <article
      className="max-w-none text-sm leading-relaxed text-muted-foreground
        [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-foreground
        [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground first:[&_h2]:mt-0
        [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5
        [&_li]:mt-1.5 [&_li]:marker:text-muted-foreground/60
        [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2
        [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground
        [&_strong]:text-foreground"
    >
      <h1>{doc.title}</h1>
      <ReactMarkdown>{doc.content}</ReactMarkdown>
    </article>
  );
}
