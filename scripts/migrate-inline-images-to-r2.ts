/**
 * Moves inline base64 images (`data:image/...`) stored in the DB to Cloudflare R2
 * and replaces them with public URLs.
 *
 * Sources: product_variants.imageUrl (comma list) and products.media (JSON).
 * Identical images are uploaded once (content-hash key, so re-runs are idempotent).
 * A row is only updated if it is unchanged since it was read.
 *
 * Usage:
 *   pnpm migrate:inline-images            # dry-run, writes nothing
 *   pnpm migrate:inline-images --apply    # backup → upload → update → read-model resync
 *   pnpm migrate:inline-images --restore=backups/inline-images-<ts>.json   # rollback
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db, Prisma } from "@white-shop/db";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { validateImageBuffer } from "@/lib/security/image-magic-bytes";
import { smartSplitUrls } from "@/lib/utils/image-utils";
import { syncProductListingReadModelBatch } from "@/lib/read-model/product-read-model-sync";

const DATA_URI_MARKER = "data:image/";
const DATA_URI_PATTERN = /^data:(image\/[a-z+]+);base64,(.+)$/i;
const R2_KEY_PREFIX = "products/inline-migrated";
const HASH_KEY_LENGTH = 24;
const BACKUP_DIR = path.join(process.cwd(), "backups");
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

type Resolve = (dataUri: string) => Promise<string>;

interface PlannedImage {
  key: string;
  mime: string;
  buffer: Buffer;
  url?: string;
}

interface RowChange {
  table: "product_variants" | "products";
  id: string;
  productId: string;
  column: "imageUrl" | "media";
  original: unknown;
  next: unknown;
}

const isApply = process.argv.includes("--apply");
const images = new Map<string, PlannedImage>();
const invalidImages: string[] = [];

/** Hashes and validates a data URI; uploads it once in apply mode. */
async function resolveDataUri(dataUri: string): Promise<string> {
  const hash = createHash("sha256").update(dataUri).digest("hex");
  let planned = images.get(hash);
  if (!planned) {
    const match = dataUri.match(DATA_URI_PATTERN);
    const mime = match?.[1].toLowerCase() ?? "";
    const buffer = Buffer.from(match?.[2] ?? "", "base64");
    if (!match || !validateImageBuffer(buffer, mime)) {
      invalidImages.push(hash);
      return dataUri;
    }
    const ext = MIME_TO_EXT[mime] ?? "jpg";
    planned = { key: `${R2_KEY_PREFIX}/${hash.slice(0, HASH_KEY_LENGTH)}.${ext}`, mime, buffer };
    images.set(hash, planned);
  }
  if (!isApply) {
    return `r2://${planned.key}`;
  }
  if (planned.url) {
    return planned.url;
  }
  const url = await uploadToR2(planned.key, planned.buffer, planned.mime);
  if (!url) throw new Error(`R2 upload failed for ${planned.key}`);
  planned.url = url;
  return url;
}

async function replaceInUrlList(value: string, resolve: Resolve): Promise<string> {
  const parts = smartSplitUrls(value);
  const replaced = await Promise.all(
    parts.map((part) => (part.startsWith(DATA_URI_MARKER) ? resolve(part) : part)),
  );
  return replaced.join(",");
}

async function replaceInJson(value: unknown, resolve: Resolve): Promise<unknown> {
  if (typeof value === "string") {
    return value.startsWith(DATA_URI_MARKER) ? resolve(value) : value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => replaceInJson(item, resolve)));
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await replaceInJson(item, resolve)] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

async function planVariantChanges(): Promise<RowChange[]> {
  const variants = await db.productVariant.findMany({
    where: { imageUrl: { contains: DATA_URI_MARKER } },
    select: { id: true, productId: true, imageUrl: true },
  });
  const changes: RowChange[] = [];
  for (const variant of variants) {
    const original = variant.imageUrl ?? "";
    const next = await replaceInUrlList(original, resolveDataUri);
    if (next !== original) {
      changes.push({ table: "product_variants", id: variant.id, productId: variant.productId, column: "imageUrl", original, next });
    }
  }
  return changes;
}

async function planProductChanges(): Promise<RowChange[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM products WHERE media::text LIKE ${`%${DATA_URI_MARKER}%`}`;
  const products = await db.product.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: { id: true, media: true },
  });
  const changes: RowChange[] = [];
  for (const product of products) {
    const next = await replaceInJson(product.media, resolveDataUri);
    if (JSON.stringify(next) !== JSON.stringify(product.media)) {
      changes.push({ table: "products", id: product.id, productId: product.id, column: "media", original: product.media, next });
    }
  }
  return changes;
}

/** Updates one row only if its value is still the one that was planned against. */
async function applyChange(change: RowChange): Promise<boolean> {
  return db.$transaction(async (tx) => {
    if (change.table === "product_variants") {
      const result = await tx.productVariant.updateMany({
        where: { id: change.id, imageUrl: change.original as string },
        data: { imageUrl: change.next as string },
      });
      return result.count === 1;
    }
    const current = await tx.product.findUnique({ where: { id: change.id }, select: { media: true } });
    if (JSON.stringify(current?.media) !== JSON.stringify(change.original)) return false;
    await tx.product.update({ where: { id: change.id }, data: { media: change.next as Prisma.InputJsonValue[] } });
    return true;
  });
}

function writeBackup(changes: RowChange[]): string {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `inline-images-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const rows = changes.map(({ table, id, column, original }) => ({ table, id, column, original }));
  writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), rows }, null, 1));
  return file;
}

function printPlan(changes: RowChange[]): void {
  const bytes = [...images.values()].reduce((sum, image) => sum + image.buffer.length, 0);
  console.log(`Mode: ${isApply ? "APPLY" : "DRY-RUN (nothing is written)"}`);
  console.log(`Variant rows: ${changes.filter((c) => c.table === "product_variants").length}`);
  console.log(`Product rows: ${changes.filter((c) => c.table === "products").length}`);
  console.log(`Affected products: ${new Set(changes.map((c) => c.productId)).size}`);
  console.log(`Unique images to upload: ${images.size} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Invalid images left untouched: ${invalidImages.length}`);
}

async function applyAll(changes: RowChange[]): Promise<void> {
  console.log(`Backup: ${writeBackup(changes)}`);
  let updated = 0;
  const skipped: string[] = [];
  for (const change of changes) {
    if (await applyChange(change)) updated++;
    else skipped.push(`${change.table}:${change.id}`);
  }
  console.log(`Updated rows: ${updated}; skipped (changed concurrently): ${skipped.length}`);
  if (skipped.length > 0) console.log(skipped.join("\n"));
  const productIds = [...new Set(changes.map((change) => change.productId))];
  await syncProductListingReadModelBatch(productIds);
  console.log(`Read models resynced for ${productIds.length} products`);
}

/** Writes original values from a backup file back to the DB (rollback). */
async function restoreFromBackup(file: string): Promise<void> {
  const backup = JSON.parse(readFileSync(file, "utf8")) as {
    rows: Array<Pick<RowChange, "table" | "id" | "column" | "original">>;
  };
  const productIds = new Set<string>();
  for (const row of backup.rows) {
    if (row.table === "product_variants") {
      const variant = await db.productVariant.update({
        where: { id: row.id },
        data: { imageUrl: row.original as string },
        select: { productId: true },
      });
      productIds.add(variant.productId);
    } else {
      await db.product.update({ where: { id: row.id }, data: { media: row.original as Prisma.InputJsonValue[] } });
      productIds.add(row.id);
    }
  }
  await syncProductListingReadModelBatch([...productIds]);
  console.log(`Restored ${backup.rows.length} rows; read models resynced for ${productIds.size} products`);
}

async function main(): Promise<void> {
  const restoreArg = process.argv.find((arg) => arg.startsWith("--restore="));
  if (restoreArg) {
    await restoreFromBackup(restoreArg.slice("--restore=".length));
    return;
  }
  if (isApply && !isR2Configured()) {
    throw new Error("R2 is not configured; refusing to apply.");
  }
  const changes = [...(await planVariantChanges()), ...(await planProductChanges())];
  printPlan(changes);
  if (isApply && changes.length > 0) {
    await applyAll(changes);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error: unknown) => {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    await db.$disconnect();
    process.exit(1);
  });
