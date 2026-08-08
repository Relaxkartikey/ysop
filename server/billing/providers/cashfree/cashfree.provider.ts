import type {
  PaymentProvider,
  CheckoutSession,
  ProviderPayment,
  ProviderSubscription,
  WebhookEvent,
} from "../provider.interface";
import { getCashfreeEnv } from "./env.server";
import { verifyCashfreeWebhookSignature } from "./verify-webhook";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderPayment,
  OrderEntity,
  CashfreeWebhookPayload,
  CashfreePaymentStatus,
} from "./cashfree.types";

function mapPaymentStatus(status: CashfreePaymentStatus): ProviderPayment["status"] {
  switch (status) {
    case "SUCCESS":
      return "succeeded";
    case "FAILED":
    case "USER_DROPPED":
    case "CANCELLED":
      return "failed";
    default:
      return "pending";
  }
}

async function cashfreeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getCashfreeEnv();
  const res = await fetch(`${env.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": env.apiVersion,
      "x-client-id": env.clientId,
      "x-client-secret": env.clientSecret,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cashfree API error (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Cashfree Payment Gateway (Orders API) provider. Recurring billing is emulated in our
 * own `subscriptions` table — each renewal is a fresh Order the user pays, driven by
 * billing.service. Cashfree has no concept of "our" subscription, so
 * createSubscription/getSubscription/cancelSubscription throw rather than no-op.
 */
export class CashfreeProvider implements PaymentProvider {
  readonly name = "cashfree";

  async createCheckout(input: {
    userId: string;
    plan: import("@/lib/billing-config").BillingPlanConfig;
    successUrl: string;
    cancelUrl: string;
    customer: { email: string; phone: string; name?: string };
  }): Promise<CheckoutSession> {
    const orderId = `ysop_${input.userId.slice(0, 8)}_${Date.now()}`;
    const body: CreateOrderRequest = {
      order_id: orderId,
      order_amount: input.plan.amount / 100,
      order_currency: input.plan.currency.toUpperCase(),
      customer_details: {
        customer_id: input.userId,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email,
        customer_name: input.customer.name,
      },
      order_meta: {
        return_url: input.successUrl,
        notify_url: `${new URL(input.successUrl).origin}/api/webhooks/cashfree`,
      },
      order_note: `YSOP ${input.plan.id}`,
      order_tags: { plan_id: input.plan.id },
    };

    const order = await cashfreeFetch<CreateOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // Cashfree's Orders API has no plain hosted-checkout URL — the browser must run
    // Cashfree's JS SDK with `payment_session_id` to open checkout. We point the caller
    // at our own bridge page, which loads that SDK and starts the actual checkout.
    const origin = new URL(input.successUrl).origin;
    const url = `${origin}/checkout/cashfree?session=${encodeURIComponent(order.payment_session_id)}&order=${encodeURIComponent(order.order_id)}`;
    return { url, providerSessionId: order.payment_session_id, providerOrderId: order.order_id };
  }

  /**
   * Cashfree has no single global "get payment by id" without its order — the
   * `providerPaymentId` param here is the Cashfree `order_id` (what we store as
   * `payments.provider_order_id`); we fetch and return its latest payment attempt.
   */
  async getPayment(orderId: string): Promise<ProviderPayment> {
    const payments = await cashfreeFetch<OrderPayment[]>(`/orders/${orderId}/payments`);
    const latest = payments.at(-1);
    if (!latest) throw new Error(`No payments found for Cashfree order ${orderId}`);
    return {
      providerPaymentId: latest.cf_payment_id,
      providerOrderId: orderId,
      status: mapPaymentStatus(latest.payment_status),
      amountCents: Math.round(latest.payment_amount * 100),
      currency: latest.payment_currency,
      paidAt: latest.payment_status === "SUCCESS" ? latest.payment_time : null,
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderEntity["order_status"]> {
    const order = await cashfreeFetch<OrderEntity>(`/orders/${orderId}`);
    return order.order_status;
  }

  createSubscription(): Promise<ProviderSubscription> {
    throw new Error(
      "Cashfree Orders integration has no recurring mandate — subscriptions are emulated internally.",
    );
  }

  getSubscription(): Promise<ProviderSubscription> {
    throw new Error(
      "Cashfree Orders integration has no recurring mandate — subscriptions are emulated internally.",
    );
  }

  cancelSubscription(): Promise<void> {
    // Cancellation is an internal state change only — there's no Cashfree-side mandate to stop.
    return Promise.resolve();
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    const timestamp = headers["x-webhook-timestamp"] ?? null;
    const signature = headers["x-webhook-signature"] ?? null;
    if (!verifyCashfreeWebhookSignature(rawBody, { timestamp, signature })) {
      throw new Error("Invalid Cashfree webhook signature");
    }
    const payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
    return { type: payload.type, payload };
  }
}
