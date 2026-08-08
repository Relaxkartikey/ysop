import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/server/billing/providers";
import { processPaymentWebhook } from "@/server/billing/webhook-processor";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event;
  try {
    const provider = await getPaymentProvider("cashfree");
    event = await provider.verifyWebhook(rawBody, headers);
  } catch (err) {
    console.error("Cashfree webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await processPaymentWebhook(event);
  } catch (err) {
    console.error("Cashfree webhook processing failed", err);
    // Still 200: Cashfree retries on non-2xx, and we don't want infinite retries for a
    // bug on our side to keep hammering the endpoint. Errors are logged for follow-up.
  }

  return NextResponse.json({ received: true });
}
