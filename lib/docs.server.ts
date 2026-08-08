import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

export type DocMeta = { slug: string; title: string; order: number };
export type Doc = DocMeta & { content: string };

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key) meta[key.trim()] = rest.join(":").trim();
  }
  return { meta, content: match[2]!.trim() };
}

export function getDocsList(): DocMeta[] {
  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const raw = readFileSync(path.join(DOCS_DIR, file), "utf8");
      const { meta } = parseFrontmatter(raw);
      return {
        slug: file.replace(/\.md$/, ""),
        title: meta["title"] ?? file,
        order: Number(meta["order"] ?? 0),
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function getDocBySlug(slug: string): Doc | null {
  try {
    const raw = readFileSync(path.join(DOCS_DIR, `${slug}.md`), "utf8");
    const { meta, content } = parseFrontmatter(raw);
    return { slug, title: meta["title"] ?? slug, order: Number(meta["order"] ?? 0), content };
  } catch {
    return null;
  }
}
