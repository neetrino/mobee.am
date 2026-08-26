import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "@/config/env";

let r2Client: S3Client | null | undefined;

function getR2Client(): S3Client | null {
  if (r2Client !== undefined) {
    return r2Client;
  }
  const config = getR2Config();
  if (!config) {
    r2Client = null;
    return null;
  }
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return r2Client;
}

/**
 * Upload a buffer to R2 and return the public URL.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  const config = getR2Config();
  const client = getR2Client();
  if (!client || !config) {
    return null;
  }
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const base = config.publicUrl.replace(/\/$/, "");
  const path = key.startsWith("/") ? key.slice(1) : key;
  return `${base}/${path}`;
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}
