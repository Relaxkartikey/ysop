import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy — YSOP",
  description: "How YSOP collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="label-caps">Legal</div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated August 2026</p>

        <div className="panel mt-8 space-y-8 p-6 sm:p-8">
          <section>
            <h2 className="text-lg font-semibold">Overview</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              YSOP (&quot;we,&quot; &quot;us&quot;) is a file storage and sharing platform. This
              policy explains what information we collect when you use YSOP, how we use it, and who
              we share it with. By using YSOP you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <span className="text-foreground">Account information</span> — your email address
                and name, provided by Google when you sign in.
              </li>
              <li>
                <span className="text-foreground">File data</span> — the files you upload, along
                with metadata such as filename, size, type, and expiry date.
              </li>
              <li>
                <span className="text-foreground">YSOP storage credentials</span> — if you connect
                your own Cloudflare R2 bucket, your access keys are encrypted at rest and are never
                displayed back to you or transmitted anywhere outside the request that uses them to
                read or write to your bucket.
              </li>
              <li>
                <span className="text-foreground">Billing information</span> — if you upgrade to
                Pro, payment details are handled directly by our payment processor, Cashfree; we
                store only the resulting transaction and subscription status.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">How we use your information</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We use this information to operate the service: authenticating you, storing and
              serving your uploaded files, enforcing expiry and storage limits, and processing
              payments for Pro subscriptions. We do not sell your data, and we do not run
              advertising or third-party analytics/tracking scripts on YSOP.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Third-party services</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              YSOP is built on top of a small number of infrastructure providers, each of which
              processes data on our behalf under their own privacy terms:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Supabase — authentication and database</li>
              <li>Google — sign-in</li>
              <li>Cloudflare R2 — file storage</li>
              <li>Cashfree — payment processing for Pro subscriptions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Cookies</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We use a single session cookie to keep you signed in. We don&apos;t use cookies for
              advertising or cross-site tracking.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Data retention</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Files are deleted automatically once their chosen expiry passes. Permanent links
              (available on Pro) are retained until you delete them yourself. If you connect your
              own storage and later disconnect it, YSOP never deletes the files sitting in your
              bucket — that data remains entirely under your control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Your rights</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You can delete any file or your account at any time from your dashboard. To request a
              copy of your data or a full account deletion, contact us using the address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Questions about this policy? Reach us at{" "}
              <a href="mailto:hello@entospark.com" className="text-foreground hover:underline">
                hello@entospark.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
