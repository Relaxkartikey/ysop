/**
 * Storage provider contract.
 * The app never talks to a provider SDK directly — only through this interface,
 * so Cloudinary / R2 / S3 / local can be swapped without touching business logic.
 */
export type StorageProviderId = "supabase" | "cloudinary" | "r2" | "s3" | "local";

export interface SignedUpload {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface StorageProvider {
  readonly id: StorageProviderId;
  createSignedUpload(key: string, contentType: string): Promise<SignedUpload>;
  createSignedDownload(key: string, filename: string): Promise<string>;
  remove(keys: string[]): Promise<void>;
  /** Permanent, unsigned URL for embedding (e.g. <img src>). Undefined if the provider has no public URL configured. */
  getPublicUrl?(key: string): string | undefined;
}
