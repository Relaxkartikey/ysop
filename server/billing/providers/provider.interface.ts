import type { BillingPlanConfig } from "@/lib/billing-config";

export type CheckoutSession = {
  /** URL to redirect the user to for hosted checkout. */
  url: string;
  providerSessionId: string;
  /** Set when the provider keys payments by an order id distinct from the session id. */
  providerOrderId?: string;
};

export type ProviderPayment = {
  providerPaymentId: string;
  providerOrderId: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amountCents: number;
  currency: string;
  paidAt: string | null;
};

export type ProviderSubscription = {
  providerSubscriptionId: string;
  providerCustomerId: string;
  status: "pending" | "active" | "past_due" | "cancelled" | "expired";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type WebhookEvent = {
  type: string;
  /** Raw, provider-specific payload — billing.service maps this to a lifecycle transition. */
  payload: unknown;
};

/**
 * What every payment provider must implement. Core billing code depends only on this
 * interface, never on a specific provider, so a new one is additive, not a rewrite.
 */
export interface PaymentProvider {
  readonly name: string;

  createCheckout(input: {
    userId: string;
    plan: BillingPlanConfig;
    successUrl: string;
    cancelUrl: string;
    /** Contact details some providers require to create a checkout/order. */
    customer: { email: string; phone: string; name?: string };
  }): Promise<CheckoutSession>;

  getPayment(providerPaymentId: string): Promise<ProviderPayment>;

  createSubscription(input: {
    userId: string;
    providerCustomerId: string;
    plan: BillingPlanConfig;
  }): Promise<ProviderSubscription>;

  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;

  cancelSubscription(
    providerSubscriptionId: string,
    options: { atPeriodEnd: boolean },
  ): Promise<void>;

  /** Verifies a webhook's signature and returns the parsed event, or throws if invalid. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;
}
