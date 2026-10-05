/**
 * Fill ProductListingRow.attributeFacets where it is NULL. Update-only: never deletes rows.
 * Usage: pnpm backfill:listing-attribute-facets [--dry-run]
 */
import { db, Prisma } from "@white-shop/db";
import { fetchAttributeFacetLightRows } from "@/lib/catalog/fetch-attribute-facet-rows";
import { collectAttributeFacetEntries } from "@/lib/catalog/catalog-attribute-facets";

const PRODUCT_BATCH_SIZE = 100;
const dryRun = process.argv.includes("--dry-run");

async function backfillBatch(productIds: string[]): Promise<number> {
  const [listingRows, lightRows] = await Promise.all([
    db.productListingRow.findMany({
      where: { productId: { in: productIds }, attributeFacets: { equals: Prisma.DbNull } },
      select: { id: true, productId: true, locale: true },
    }),
    fetchAttributeFacetLightRows(productIds),
  ]);
  const variantsById = new Map(lightRows.map((row) => [row.id, row.variants]));

  let updated = 0;
  for (const row of listingRows) {
    const entries = collectAttributeFacetEntries(variantsById.get(row.productId) ?? [], row.locale);
    if (!dryRun) {
      await db.productListingRow.update({
        where: { id: row.id },
        data: { attributeFacets: entries as Prisma.InputJsonValue },
      });
    }
    updated += 1;
  }
  return updated;
}

async function main(): Promise<void> {
  const products = await db.productListingRow.findMany({
    where: { attributeFacets: { equals: Prisma.DbNull } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const productIds = products.map((row) => row.productId);
  process.stdout.write(`Products with NULL attributeFacets: ${productIds.length}${dryRun ? " (dry run)" : ""}\n`);

  let total = 0;
  for (let index = 0; index < productIds.length; index += PRODUCT_BATCH_SIZE) {
    total += await backfillBatch(productIds.slice(index, index + PRODUCT_BATCH_SIZE));
    process.stdout.write(`Rows ${dryRun ? "to update" : "updated"}: ${total}\n`);
  }
  await db.$disconnect();
}

main().catch(async (error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  await db.$disconnect();
  process.exit(1);
});
