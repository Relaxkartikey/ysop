import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * At-rest encryption for personal storage-node credentials (BYOS).
 * AES-256-GCM with a key derived from STORAGE_CREDENTIALS_SECRET — never
 * derived from a request, never logged, never returned to a client.
 */
function key(): Buffer {
  const secret = process.env["STORAGE_CREDENTIALS_SECRET"];
  if (!secret) throw new Error("Missing STORAGE_CREDENTIALS_SECRET environment variable");
  return scryptSync(secret, "regreso-storage-node-credentials", 32);
}

export function encryptCredentials(data: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("hex")).join(":");
}

export function decryptCredentials<T>(stored: string): T {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed stored credentials");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
