import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SignedUpload, StorageProvider } from "./storage.interface";

export type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Reads the platform's shared R2 credentials from the environment. */
export function platformR2Credentials(): R2Credentials {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];

  if (!accountId || !accessKeyId || !secretAccessKey) {
    const missing = [
      ...(!accountId ? ["R2_ACCOUNT_ID"] : []),
      ...(!accessKeyId ? ["R2_ACCESS_KEY_ID"] : []),
      ...(!secretAccessKey ? ["R2_SECRET_ACCESS_KEY"] : []),
    ];
    throw new Error(`Missing R2 environment variable(s): ${missing.join(", ")}`);
  }
  return { accountId, accessKeyId, secretAccessKey };
}

/**
 * Cloudflare R2 speaks the S3 API, so this uses the standard AWS S3 SDK
 * pointed at R2's account-scoped endpoint. Platform nodes share one set of
 * credentials from the environment; personal (BYOS) nodes pass their own,
 * decrypted just-in-time by the caller — never persisted in plaintext.
 */
function client(creds: R2Credentials) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${creds.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
  });
}

export function createR2StorageProvider(
  creds: R2Credentials,
  bucket: string,
  publicBaseUrl?: string | null,
): StorageProvider {
  return {
    id: "r2",

    getPublicUrl(key: string): string | undefined {
      if (!publicBaseUrl) return undefined;
      return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
    },

    async createSignedUpload(key: string, contentType: string): Promise<SignedUpload> {
      const url = await getSignedUrl(
        client(creds),
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
        { expiresIn: 600 },
      );
      return { url, method: "PUT", headers: {} };
    },

    async createSignedDownload(key: string, filename: string): Promise<string> {
      return getSignedUrl(
        client(creds),
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
        }),
        { expiresIn: 600 },
      );
    },

    async remove(keys: string[]): Promise<void> {
      if (!keys.length) return;
      await client(creds).send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    },
  };
}

/** Connection test for the BYOS connect flow: verifies credentials + bucket without writing anything. */
export async function testR2Connection(creds: R2Credentials, bucket: string): Promise<void> {
  await client(creds).send(new HeadBucketCommand({ Bucket: bucket }));
}
