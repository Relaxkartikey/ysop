import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Terms of Service — YSOP",
  description: "The terms that govern your use of YSOP.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="label-caps">Legal</div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated August 2026</p>

        <div className="panel mt-8 space-y-8 p-6 sm:p-8">
          <section>
            <h2 className="text-lg font-semibold">Acceptance</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              By creating an account or uploading a file to YSOP, you agree to these terms. If you
              don&apos;t agree with them, please don&apos;t use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Your account</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You&apos;re responsible for everything that happens under your account. Sign-in is
              handled through Google via Supabase Auth — keep access to that account secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Acceptable use</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Don&apos;t use YSOP to upload or distribute content that&apos;s illegal, infringes
              someone else&apos;s rights, or that you don&apos;t have permission to share. We
              reserve the right to remove content and suspend accounts that violate this.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">File expiry &amp; deletion</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Files you upload are deleted automatically once the expiry you selected passes — this
              is a core part of how the service works, not something we can reverse after the fact.
              Permanent links (Pro) are kept until you delete them yourself.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">YSOP — Your Storages at One Place</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you connect your own Cloudflare R2 bucket, you&apos;re responsible for its cost,
              availability, and configuration. YSOP reads and writes to it on your behalf but never
              deletes files from it beyond what you explicitly request — even if you disconnect the
              bucket from your account later.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Billing</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Pro subscriptions are billed monthly or yearly through Cashfree. Your Pro entitlement
              stays active until the end of the period you&apos;ve already paid for, even after you
              cancel — cancelling stops future renewals, it doesn&apos;t end your current period
              early. We don&apos;t process automatic refunds for partial periods.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Limitation of liability</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              YSOP is provided as-is. We work to keep the service reliable, but we&apos;re not
              liable for lost files, missed deadlines, or damages arising from your use of the
              service, to the extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Termination</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You can delete your account at any time. We may suspend or terminate accounts that
              violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Changes to these terms</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We may update these terms as the product changes. Material changes will be reflected
              on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Questions? Reach us at{" "}
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
