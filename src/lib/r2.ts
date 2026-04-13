import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

const r2 =
  accountId && accessKeyId && secretAccessKey && bucketName
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

/**
 * Upload a buffer to R2 and return the public URL.
 * Key will be prefixed with "products/" and get a unique suffix.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  if (!r2 || !bucketName || !publicUrl) {
    return null;
  }
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const base = publicUrl.replace(/\/$/, "");
  const path = key.startsWith("/") ? key.slice(1) : key;
  return `${base}/${path}`;
}

export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicUrl);
}
