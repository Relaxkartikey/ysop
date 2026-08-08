import { createHmac, timingSafeEqual } from "node:crypto";
import { getCashfreeEnv } from "./env.server";

/**
 * Cashfree webhook verification: base64(HMAC-SHA256(x-webhook-timestamp + raw_body, client_secret)),
 * compared against the `x-webhook-signature` header. Must run against the exact raw request
 * body — never a re-serialized/parsed copy, since that can shift decimal formatting and break
 * the signature. https://www.cashfree.com/docs/api-reference/vrs/webhook-signature-verification
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  headers: { timestamp: string | null; signature: string | null },
): boolean {
  if (!headers.timestamp || !headers.signature) return false;

  const { clientSecret } = getCashfreeEnv();
  const expected = createHmac("sha256", clientSecret)
    .update(headers.timestamp + rawBody)
    .digest("base64");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(headers.signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
