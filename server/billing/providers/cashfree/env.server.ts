export type CashfreeEnv = {
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  baseUrl: string;
  isSandbox: boolean;
};

/** Reads Cashfree credentials lazily, so importing this module never requires them to be set. */
export function getCashfreeEnv(): CashfreeEnv {
  const clientId = process.env["CASHFREE_CLIENT_ID"];
  const clientSecret = process.env["CASHFREE_CLIENT_SECRET"];
  const mode = process.env["CASHFREE_ENV"] ?? "sandbox";

  const missing = [
    ...(!clientId ? ["CASHFREE_CLIENT_ID"] : []),
    ...(!clientSecret ? ["CASHFREE_CLIENT_SECRET"] : []),
  ];
  if (missing.length) {
    throw new Error(`Missing Cashfree environment variable(s): ${missing.join(", ")}`);
  }

  const isSandbox = mode !== "production";
  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    apiVersion: process.env["CASHFREE_API_VERSION"] ?? "2023-08-01",
    baseUrl: isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg",
    isSandbox,
  };
}
