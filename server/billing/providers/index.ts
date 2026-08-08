import type { PaymentProvider } from "./provider.interface";

/** Registry of configured payment providers, keyed by `payments.provider` / `subscriptions.provider`. */
export async function getPaymentProvider(name: string): Promise<PaymentProvider> {
  switch (name) {
    case "cashfree": {
      const { CashfreeProvider } = await import("./cashfree/cashfree.provider");
      return new CashfreeProvider();
    }
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}
