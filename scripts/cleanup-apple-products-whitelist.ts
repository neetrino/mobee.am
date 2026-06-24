#!/usr/bin/env node
/**
 * Apple catalog whitelist cleanup — dry-run audit by default.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-apple-products-whitelist.ts --dry-run
 *   pnpm tsx scripts/cleanup-apple-products-whitelist.ts --apply
 */

import fs from "node:fs";
import path from "node:path";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient, type Prisma } from "../shared/db/generated/client";
import {
  classifyProductByTitles,
  isAppleBrandSlug,
} from "./lib/apple-cleanup/matching";
import {
  collectR2KeysFromJsonValue,
  collectR2KeysFromMedia,
  collectR2KeysFromUrl,
  isProtectedR2Key,
} from "./lib/apple-cleanup/r2-keys";

const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, "backups", "apple-cleanup");

type JsonValue = Prisma.JsonValue;

interface ProductRow {
  id: string;
  skuPrefix: string | null;
  media: JsonValue[];
  deletedAt: Date | null;
  brand: { slug: string } | null;
  translations: Array<{ locale: string; title: string; slug: string }>;
  variants: Array<{
    id: string;
    sku: string | null;
    imageUrl: string | null;
    media: JsonValue[];
    options: Array<{ id: string; attributeKey: string | null; value: string | null }>;
  }>;
  labels: Array<{ id: string; type: string; value: string }>;
  _count: { reviews: number; cartItems: number };
}

interface ClassifiedProduct {
  product: ProductRow;
  match: ReturnType<typeof classifyProductByTitles>;
  variantCount: number;
  optionCount: number;
  orderItemCount: number;
  r2Keys: Set<string>;
}

function loadEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function timestampForFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("-");
}

function parseMode(argv: string[]): "dry-run" | "apply" {
  if (argv.includes("--apply")) return "apply";
  return "dry-run";
}

function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 env: R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function collectProductR2Keys(product: ProductRow, publicUrlBase: string): Set<string> {
  const keys = new Set<string>();
  for (const key of collectR2KeysFromMedia(product.media, publicUrlBase)) keys.add(key);
  for (const variant of product.variants) {
    for (const key of collectR2KeysFromUrl(variant.imageUrl, publicUrlBase)) keys.add(key);
    for (const key of collectR2KeysFromMedia(variant.media, publicUrlBase)) keys.add(key);
  }
  return keys;
}

async function fetchAppleProducts(prisma: PrismaClient): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      brand: { select: { slug: true } },
      translations: { select: { locale: true, title: true, slug: true } },
      variants: {
        include: {
          options: { select: { id: true, attributeKey: true, value: true } },
        },
      },
      labels: { select: { id: true, type: true, value: true } },
      _count: { select: { reviews: true, cartItems: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return products.filter((product) => isAppleBrandSlug(product.brand?.slug)) as ProductRow[];
}

async function countOrderItemsForVariants(
  prisma: PrismaClient,
  variantIds: string[],
): Promise<number> {
  if (variantIds.length === 0) return 0;
  return prisma.orderItem.count({
    where: { variantId: { in: variantIds } },
  });
}

async function collectExternalDbR2Keys(
  prisma: PrismaClient,
  publicUrlBase: string,
  survivingProductIds: Set<string>,
): Promise<Set<string>> {
  const keys = new Set<string>();

  const [products, variants, categories, brands, attributeValues, orderItems, settings] =
    await Promise.all([
      prisma.product.findMany({
        where: { id: { in: [...survivingProductIds] } },
        select: { media: true },
      }),
      prisma.productVariant.findMany({
        where: { productId: { in: [...survivingProductIds] } },
        select: { imageUrl: true, media: true },
      }),
      prisma.category.findMany({ select: { media: true } }),
      prisma.brand.findMany({ select: { logoUrl: true } }),
      prisma.attributeValue.findMany({ select: { imageUrl: true } }),
      prisma.orderItem.findMany({ select: { imageUrl: true } }),
      prisma.settings.findMany({ select: { value: true } }),
    ]);

  for (const product of products) {
    for (const key of collectR2KeysFromMedia(product.media, publicUrlBase)) keys.add(key);
  }
  for (const variant of variants) {
    for (const key of collectR2KeysFromUrl(variant.imageUrl, publicUrlBase)) keys.add(key);
    for (const key of collectR2KeysFromMedia(variant.media, publicUrlBase)) keys.add(key);
  }
  for (const category of categories) {
    for (const key of collectR2KeysFromMedia(category.media, publicUrlBase)) keys.add(key);
  }
  for (const brand of brands) {
    for (const key of collectR2KeysFromUrl(brand.logoUrl, publicUrlBase)) keys.add(key);
  }
  for (const av of attributeValues) {
    for (const key of collectR2KeysFromUrl(av.imageUrl, publicUrlBase)) keys.add(key);
  }
  for (const item of orderItems) {
    for (const key of collectR2KeysFromUrl(item.imageUrl, publicUrlBase)) keys.add(key);
  }
  for (const setting of settings) {
    collectR2KeysFromJsonValue(setting.value, publicUrlBase, keys);
  }

  return keys;
}

async function classifyAppleProducts(
  prisma: PrismaClient,
  products: ProductRow[],
  publicUrlBase: string,
): Promise<{
  keep: ClassifiedProduct[];
  toDelete: ClassifiedProduct[];
  ambiguous: ClassifiedProduct[];
}> {
  const keep: ClassifiedProduct[] = [];
  const toDelete: ClassifiedProduct[] = [];
  const ambiguous: ClassifiedProduct[] = [];

  for (const product of products) {
    const titles = product.translations.map((t) => t.title);
    const match = classifyProductByTitles(titles);
    const variantIds = product.variants.map((v) => v.id);
    const orderItemCount = await countOrderItemsForVariants(prisma, variantIds);
    const optionCount = product.variants.reduce((sum, v) => sum + v.options.length, 0);
    const classified: ClassifiedProduct = {
      product,
      match,
      variantCount: product.variants.length,
      optionCount,
      orderItemCount,
      r2Keys: collectProductR2Keys(product, publicUrlBase),
    };

    if (match.result === "keep") keep.push(classified);
    else if (match.result === "ambiguous") ambiguous.push(classified);
    else toDelete.push(classified);
  }

  return { keep, toDelete, ambiguous };
}

function printSection(title: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function printAuditReport(params: {
  totalAppleProducts: number;
  totalProductsInDb: number;
  nonAppleProducts: number;
  keep: ClassifiedProduct[];
  toDelete: ClassifiedProduct[];
  ambiguous: ClassifiedProduct[];
  r2DeleteCandidates: string[];
  r2Protected: string[];
  survivingDbR2Keys: Set<string>;
}): void {
  const {
    totalAppleProducts,
    totalProductsInDb,
    nonAppleProducts,
    keep,
    toDelete,
    ambiguous,
    r2DeleteCandidates,
    r2Protected,
    survivingDbR2Keys,
  } = params;

  printSection("APPLE CATALOG WHITELIST CLEANUP — DRY RUN AUDIT");
  console.log(`Mode: DRY RUN (no database or R2 changes)`);
  console.log(`Total products in DB (active): ${totalProductsInDb}`);
  console.log(`Apple-brand products (scope):   ${totalAppleProducts}`);
  console.log(`Non-Apple products (untouched): ${nonAppleProducts}`);
  console.log(`Keep count:                     ${keep.length}`);
  console.log(`Delete count:                   ${toDelete.length}`);
  console.log(`Ambiguous count:                ${ambiguous.length}`);
  console.log(`R2 delete candidate count:      ${r2DeleteCandidates.length}`);
  console.log(`R2 protected/shared count:      ${r2Protected.length}`);
  console.log(`R2 keys surviving after delete: ${survivingDbR2Keys.size}`);

  printSection("1. PRODUCTS TO KEEP");
  if (keep.length === 0) {
    console.log("(none)");
  } else {
    for (const item of keep.sort((a, b) => a.match.baseName.localeCompare(b.match.baseName))) {
      console.log(
        `- ${item.match.baseName} [id=${item.product.id}, variants=${item.variantCount}, whitelist=${item.match.matchedWhitelistEntry}]`,
      );
    }
  }

  printSection("2. PRODUCTS TO DELETE");
  if (toDelete.length === 0) {
    console.log("(none)");
  } else {
    for (const item of toDelete.sort((a, b) => a.match.baseName.localeCompare(b.match.baseName))) {
      const orderNote =
        item.orderItemCount > 0 ? `, orderItems=${item.orderItemCount} (variantId will be nulled)` : "";
      console.log(
        `- ${item.match.baseName || "(untitled)"} [id=${item.product.id}, variants=${item.variantCount}, options=${item.optionCount}${orderNote}]`,
      );
    }
  }

  printSection("3. AMBIGUOUS PRODUCTS (NOT DELETED UNTIL REVIEWED)");
  if (ambiguous.length === 0) {
    console.log("(none)");
  } else {
    for (const item of ambiguous) {
      console.log(
        `- ${item.match.baseName || "(untitled)"} [id=${item.product.id}] — ${item.match.ambiguityReason}`,
      );
    }
  }

  printSection("4. VARIANTS / OPTIONS / MEDIA FOR DELETE CANDIDATES");
  const deleteVariants = toDelete.reduce((sum, p) => sum + p.variantCount, 0);
  const deleteOptions = toDelete.reduce((sum, p) => sum + p.optionCount, 0);
  const deleteMediaItems = toDelete.reduce((sum, p) => sum + p.r2Keys.size, 0);
  const deleteReviews = toDelete.reduce((sum, p) => sum + p.product._count.reviews, 0);
  const deleteCartItems = toDelete.reduce((sum, p) => sum + p.product._count.cartItems, 0);
  console.log(`Variants to delete:     ${deleteVariants}`);
  console.log(`Options to delete:      ${deleteOptions}`);
  console.log(`Product media R2 keys:  ${deleteMediaItems}`);
  console.log(`Reviews to delete:      ${deleteReviews}`);
  console.log(`Cart items to delete:   ${deleteCartItems}`);

  printSection("5. R2 KEYS — DELETE CANDIDATES");
  if (r2DeleteCandidates.length === 0) {
    console.log("(none)");
  } else {
    for (const key of r2DeleteCandidates) console.log(`- ${key}`);
  }

  printSection("6. R2 KEYS — PROTECTED (KEEP)");
  if (r2Protected.length === 0) {
    console.log("(none)");
  } else {
    for (const key of r2Protected) console.log(`- ${key}`);
  }

  printSection("FULL LIST — PRODUCT NAMES TO DELETE");
  const deleteNames = toDelete.map((p) => p.match.baseName || "(untitled)").sort();
  if (deleteNames.length === 0) console.log("(none)");
  else deleteNames.forEach((name) => console.log(`- ${name}`));

  printSection("FULL LIST — AMBIGUOUS PRODUCT NAMES");
  const ambiguousNames = ambiguous.map((p) => p.match.baseName || "(untitled)").sort();
  if (ambiguousNames.length === 0) console.log("(none)");
  else ambiguousNames.forEach((name) => console.log(`- ${name}`));

  printSection("FULL LIST — R2 KEYS TO DELETE");
  if (r2DeleteCandidates.length === 0) console.log("(none)");
  else r2DeleteCandidates.forEach((key) => console.log(`- ${key}`));
}

async function exportBackup(
  classified: ClassifiedProduct[],
  filePath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = classified.map((item) => ({
    id: item.product.id,
    baseName: item.match.baseName,
    brandSlug: item.product.brand?.slug ?? null,
    translations: item.product.translations,
    skuPrefix: item.product.skuPrefix,
    media: item.product.media,
    variants: item.product.variants,
    labels: item.product.labels,
    variantCount: item.variantCount,
    optionCount: item.optionCount,
    orderItemCount: item.orderItemCount,
    r2Keys: [...item.r2Keys],
  }));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function applyDatabaseCleanup(
  prisma: PrismaClient,
  toDelete: ClassifiedProduct[],
): Promise<void> {
  const productIds = toDelete.map((p) => p.product.id);
  const variantIds = toDelete.flatMap((p) => p.product.variants.map((v) => v.id));

  await prisma.$transaction(async (tx) => {
    if (variantIds.length > 0) {
      await tx.orderItem.updateMany({
        where: { variantId: { in: variantIds } },
        data: { variantId: null },
      });
    }

    if (productIds.length > 0) {
      await tx.cartItem.deleteMany({ where: { productId: { in: productIds } } });
      await tx.productReview.deleteMany({ where: { productId: { in: productIds } } });
      await tx.product.deleteMany({ where: { id: { in: productIds } } });
    }
  });
}

async function deleteR2Keys(
  keys: string[],
  failedLogPath: string,
): Promise<{ deleted: number; failed: string[] }> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2_BUCKET_NAME");

  const client = createR2Client();
  const failed: string[] = [];
  let deleted = 0;

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    try {
      const response = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch, Quiet: false },
        }),
      );
      deleted += (response.Deleted ?? []).length;
      for (const err of response.Errors ?? []) {
        if (err.Key) failed.push(err.Key);
      }
    } catch {
      failed.push(...batch.map((item) => item.Key));
    }
  }

  if (failed.length > 0) {
    fs.mkdirSync(path.dirname(failedLogPath), { recursive: true });
    fs.writeFileSync(failedLogPath, JSON.stringify({ failed, at: new Date().toISOString() }, null, 2));
  }

  return { deleted, failed };
}

async function main(): Promise<void> {
  loadEnv(path.join(ROOT, ".env"));
  const mode = parseMode(process.argv);
  const publicUrlBase = process.env.R2_PUBLIC_URL ?? "";

  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in .env");
  }

  const prisma = new PrismaClient();
  try {
    const [totalProductsInDb, appleProducts] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      fetchAppleProducts(prisma),
    ]);

    const nonAppleProducts = totalProductsInDb - appleProducts.length;
    const { keep, toDelete, ambiguous } = await classifyAppleProducts(
      prisma,
      appleProducts,
      publicUrlBase,
    );

    const deleteProductIds = new Set(toDelete.map((item) => item.product.id));
    const allActiveProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, brand: { select: { slug: true } } },
    });
    const survivingProductIds = new Set(
      allActiveProducts
        .filter((product) => !deleteProductIds.has(product.id))
        .map((product) => product.id),
    );

    const survivingDbR2Keys = publicUrlBase
      ? await collectExternalDbR2Keys(prisma, publicUrlBase, survivingProductIds)
      : new Set<string>();

    const deleteR2KeysRaw = new Set<string>();
    for (const item of toDelete) {
      for (const key of item.r2Keys) deleteR2KeysRaw.add(key);
    }

    const r2Protected: string[] = [];
    const r2DeleteCandidates: string[] = [];

    for (const key of [...deleteR2KeysRaw].sort()) {
      if (isProtectedR2Key(key) || survivingDbR2Keys.has(key)) {
        r2Protected.push(key);
      } else {
        r2DeleteCandidates.push(key);
      }
    }

    printAuditReport({
      totalAppleProducts: appleProducts.length,
      totalProductsInDb,
      nonAppleProducts,
      keep,
      toDelete,
      ambiguous,
      r2DeleteCandidates,
      r2Protected,
      survivingDbR2Keys,
    });

    const reportPath = path.join(
      BACKUP_DIR,
      `apple-cleanup-dry-run-${timestampForFilename()}.json`,
    );
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          mode,
          generatedAt: new Date().toISOString(),
          totals: {
            totalProductsInDb,
            appleProducts: appleProducts.length,
            nonAppleProducts,
            keep: keep.length,
            delete: toDelete.length,
            ambiguous: ambiguous.length,
            r2DeleteCandidates: r2DeleteCandidates.length,
            r2Protected: r2Protected.length,
            deleteVariants: toDelete.reduce((sum, item) => sum + item.variantCount, 0),
            deleteOptions: toDelete.reduce((sum, item) => sum + item.optionCount, 0),
            deleteCartItems: toDelete.reduce((sum, item) => sum + item.product._count.cartItems, 0),
          },
          keep: keep.map((item) => ({
            id: item.product.id,
            baseName: item.match.baseName,
            whitelist: item.match.matchedWhitelistEntry,
            variants: item.variantCount,
          })),
          delete: toDelete.map((item) => ({
            id: item.product.id,
            baseName: item.match.baseName,
            normalizedBaseName: item.match.normalizedBaseName,
            variants: item.variantCount,
            options: item.optionCount,
            orderItems: item.orderItemCount,
          })),
          ambiguous: ambiguous.map((item) => ({
            id: item.product.id,
            baseName: item.match.baseName,
            reason: item.match.ambiguityReason,
          })),
          r2DeleteCandidates,
          r2Protected,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\n📄 Dry-run JSON report: ${reportPath}`);

    if (mode === "dry-run") {
      console.log("\n✅ Dry-run complete. No changes were made.");
      console.log("Review the output, then run with --apply to execute cleanup.");
      return;
    }

    if (ambiguous.length > 0) {
      throw new Error(
        `Aborting apply: ${ambiguous.length} ambiguous product(s) must be reviewed first.`,
      );
    }

    if (toDelete.length === 0) {
      console.log("\n✅ Nothing to delete.");
      return;
    }

    const stamp = timestampForFilename();
    const backupPath = path.join(BACKUP_DIR, `apple-cleanup-backup-${stamp}.json`);
    await exportBackup(toDelete, backupPath);
    console.log(`\n📦 Backup written: ${backupPath}`);

    await applyDatabaseCleanup(prisma, toDelete);
    console.log(`✅ Database cleanup complete (${toDelete.length} products deleted).`);

    if (r2DeleteCandidates.length > 0 && publicUrlBase) {
      const failedLogPath = path.join(BACKUP_DIR, `r2-delete-failed-${stamp}.json`);
      const r2Result = await deleteR2Keys(r2DeleteCandidates, failedLogPath);
      console.log(`✅ R2 cleanup: deleted=${r2Result.deleted}, failed=${r2Result.failed.length}`);
      if (r2Result.failed.length > 0) {
        console.log(`⚠ Failed R2 keys logged to: ${failedLogPath}`);
      }
    } else if (r2DeleteCandidates.length > 0) {
      console.log("⚠ R2_PUBLIC_URL not set — skipped R2 deletion.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ ${message}`);
  process.exit(1);
});
