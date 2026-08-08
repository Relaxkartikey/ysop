export type BillingInterval = "monthly" | "yearly";

export type BillingPlanConfig = {
  id: "pro_monthly" | "pro_yearly";
  plan: "pro";
  interval: BillingInterval;
  /** Smallest currency unit (paise for INR), matching `payments.amount_cents`. */
  amount: number;
  currency: string;
  /** The provider's own plan/price id, set once a provider is wired up. */
  providerPlanId: string | null;
};

/**
 * Single source of truth for Pro pricing. UI and server actions must read
 * from here — never hardcode an amount inline — so pricing changes in one place.
 */
export const BILLING_PLANS: Record<"pro_monthly" | "pro_yearly", BillingPlanConfig> = {
  pro_monthly: {
    id: "pro_monthly",
    plan: "pro",
    interval: "monthly",
    amount: 19900,
    currency: "inr",
    providerPlanId: null,
  },
  pro_yearly: {
    id: "pro_yearly",
    plan: "pro",
    interval: "yearly",
    amount: 199900,
    currency: "inr",
    providerPlanId: null,
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  inr: "₹",
  usd: "$",
};

/** Formats a smallest-unit amount (paise/cents) + currency code for display — the one place UI reads a symbol from. */
export function formatMoney(amountSmallestUnit: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] ?? `${currency.toUpperCase()} `;
  const major = amountSmallestUnit / 100;
  return `${symbol}${major.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
