#!/usr/bin/env node

/**
 * Uploads public/images/product-card-display.png to R2 at key static/product-card-display.png.
 * Then set NEXT_PUBLIC_PRODUCT_CARD_DISPLAY_IMAGE_URL in .env to the printed URL and rebuild.
 *
 * Usage (from project root): pnpm run upload:product-card-image-r2
 *
 * Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL in .env
 */

 
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const STATIC_KEY = "static/product-card-display.png";
const RELATIVE_IMAGE = "public/images/product-card-display.png";

function loadEnvFromRoot() {
  const root = path.join(__dirname, "..");
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    return root;
  }
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const eq = t.indexOf("=");
      if (eq > 0) {
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
  return root;
}

async function main() {
  const root = loadEnvFromRoot();
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    console.error(
      "Missing R2 env: need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL"
    );
    process.exit(1);
  }

  const filePath = path.join(root, RELATIVE_IMAGE);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const body = fs.readFileSync(filePath);
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: STATIC_KEY,
      Body: body,
      ContentType: "image/png",
    })
  );

  const base = publicUrl.replace(/\/$/, "");
  const pathPart = STATIC_KEY.startsWith("/") ? STATIC_KEY.slice(1) : STATIC_KEY;
  const absoluteUrl = `${base}/${pathPart}`;

  console.log("Uploaded to R2:", absoluteUrl);
  console.log("");
  console.log("Add to .env (then restart dev / rebuild):");
  console.log(`NEXT_PUBLIC_PRODUCT_CARD_DISPLAY_IMAGE_URL="${absoluteUrl}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
