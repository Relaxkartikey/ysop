import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HomePricing } from "@/components/home-pricing";

export const metadata: Metadata = {
  title: "Pricing — YSOP",
  description: "Free platform storage, or connect your own Cloudflare R2 bucket with Pro.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pt-16">
        <div className="text-center">
          <div className="label-caps">Pricing</div>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing, no surprises
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Start free on platform storage. Upgrade when you want your own.
          </p>
        </div>
      </main>
      <HomePricing />
      <SiteFooter />
    </div>
  );
}
