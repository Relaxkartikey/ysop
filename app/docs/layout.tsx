import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDocsList } from "@/lib/docs.server";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = getDocsList();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-16">
        <div className="label-caps">Documentation</div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">How YSOP works</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav className="md:sticky md:top-24 md:self-start">
            <ul className="space-y-1">
              {docs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/docs/${doc.slug}`}
                    className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="panel min-w-0 p-6 sm:p-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
