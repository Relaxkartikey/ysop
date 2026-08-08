import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getDocsList } from "@/lib/docs.server";

const PATHS = ["/", "/upload", "/auth", "/about", "/pricing", "/privacy", "/terms", "/docs"];

export default function sitemap(): MetadataRoute.Sitemap {
  const docPaths = getDocsList().map((doc) => `/docs/${doc.slug}`);
  return [...PATHS, ...docPaths].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: "weekly",
    priority: p === "/" ? 1.0 : 0.8,
  }));
}
