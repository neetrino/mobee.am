/**
 * Promote product-facing keys of ProductVariant.attributes (JSONB) to real Attribute rows:
 * creates Attribute/AttributeValue (+ hy/en/ru translations), ProductVariantOption,
 * ProductAttribute and Product.attributeIds, canonicalizes JSONB values, then resyncs read models.
 * Idempotent; never deletes data.
 * Usage: pnpm backfill:variant-json-attributes [--dry-run]
 */
import { db, Prisma } from "@white-shop/db";
import { CATALOG_NON_FACET_ATTRIBUTE_KEYS } from "@/lib/catalog/catalog.constants";
import { syncProductListingReadModelBatch } from "@/lib/read-model/product-read-model-sync";
import { VARIANT_JSON_ATTRIBUTE_DEFINITIONS } from "./lib/variant-json-attributes/definitions";
import { buildBackfillPlan, type PlannedVariant } from "./lib/variant-json-attributes/plan";
import {
  ensureAttributeWithValues,
  type ResolvedAttribute,
} from "./lib/variant-json-attributes/attribute-upsert";

const dryRun = process.argv.includes("--dry-run");
const ATTRIBUTE_KEYS = VARIANT_JSON_ATTRIBUTE_DEFINITIONS.map((definition) => definition.key);

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function findVariantIdsWithJsonKeys(keys: readonly string[]): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM product_variants
    WHERE jsonb_typeof(attributes) = 'object' AND attributes ?| ${[...keys]}::text[]
  `);
  return rows.map((row) => row.id);
}

async function loadPlanInputs(variantIds: string[]) {
  const variants = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      productId: true,
      attributes: true,
      options: {
        select: { attributeKey: true, attributeValue: { select: { attribute: { select: { key: true } } } } },
      },
    },
  });
  return variants.map((variant) => ({
    id: variant.id,
    productId: variant.productId,
    attributes: variant.attributes,
    optionKeys: variant.options
      .map((option) => option.attributeValue?.attribute.key ?? option.attributeKey ?? "")
      .filter(Boolean),
  }));
}

async function resolveAttributes(
  valuesByKey: Map<string, Set<string>>,
): Promise<Map<string, ResolvedAttribute>> {
  const resolved = new Map<string, ResolvedAttribute>();
  for (const definition of VARIANT_JSON_ATTRIBUTE_DEFINITIONS) {
    const values = valuesByKey.get(definition.key);
    if (!values || values.size === 0) continue;
    const result = await ensureAttributeWithValues(definition, values);
    resolved.set(definition.key, result.attribute);
    log(
      `  ${definition.key}: attribute ${result.createdAttribute ? "created" : "exists"}, ` +
        `${result.createdValues} value(s) created`,
    );
  }
  return resolved;
}

async function applyProduct(
  productId: string,
  variants: PlannedVariant[],
  attributes: Map<string, ResolvedAttribute>,
): Promise<void> {
  const attributeIds = new Set<string>();
  await db.$transaction(async (tx) => {
    for (const variant of variants) {
      const options = variant.options.flatMap(({ key, value }) => {
        const attribute = attributes.get(key);
        const valueId = attribute?.valueIds.get(value.toLowerCase());
        if (!attribute || !valueId) return [];
        attributeIds.add(attribute.id);
        return [{ variantId: variant.variantId, attributeId: attribute.id, attributeKey: key, valueId, value }];
      });
      if (options.length > 0) await tx.productVariantOption.createMany({ data: options });
      if (variant.normalizedAttributes) {
        await tx.productVariant.update({
          where: { id: variant.variantId },
          data: { attributes: variant.normalizedAttributes as Prisma.InputJsonValue },
        });
      }
    }
    if (attributeIds.size === 0) return;
    const ids = [...attributeIds];
    await tx.productAttribute.createMany({
      data: ids.map((attributeId) => ({ productId, attributeId })),
      skipDuplicates: true,
    });
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { attributeIds: true } });
    const merged = [...new Set([...product.attributeIds, ...ids])];
    if (merged.length !== product.attributeIds.length) {
      await tx.product.update({ where: { id: productId }, data: { attributeIds: merged } });
    }
  });
}

function groupByProduct(variants: PlannedVariant[]): Map<string, PlannedVariant[]> {
  const grouped = new Map<string, PlannedVariant[]>();
  for (const variant of variants) {
    const list = grouped.get(variant.productId) ?? [];
    list.push(variant);
    grouped.set(variant.productId, list);
  }
  return grouped;
}

function logPlan(plan: ReturnType<typeof buildBackfillPlan>, productCount: number): void {
  for (const [key, values] of plan.valuesByKey) {
    log(`  ${key}: ${[...values].join(", ")}`);
  }
  const optionCount = plan.variants.reduce((sum, variant) => sum + variant.options.length, 0);
  const jsonCount = plan.variants.filter((variant) => variant.normalizedAttributes).length;
  log(`Options to create: ${optionCount}; JSONB values to canonicalize: ${jsonCount}; products: ${productCount}`);
}

async function main(): Promise<void> {
  const inputs = await loadPlanInputs(await findVariantIdsWithJsonKeys(ATTRIBUTE_KEYS));
  const plan = buildBackfillPlan(inputs, VARIANT_JSON_ATTRIBUTE_DEFINITIONS);
  const byProduct = groupByProduct(plan.variants);
  log(`Variants scanned: ${inputs.length}${dryRun ? " (dry run)" : ""}`);
  logPlan(plan, byProduct.size);
  if (dryRun) return;

  const attributes = await resolveAttributes(plan.valuesByKey);
  for (const [productId, variants] of byProduct) {
    await applyProduct(productId, variants, attributes);
  }
  log(`Products updated: ${byProduct.size}`);

  const facetVariantIds = await findVariantIdsWithJsonKeys([...CATALOG_NON_FACET_ATTRIBUTE_KEYS]);
  const facetProducts = await db.productVariant.findMany({
    where: { id: { in: facetVariantIds } },
    select: { productId: true },
  });
  const resyncIds = [...new Set([...byProduct.keys(), ...facetProducts.map((row) => row.productId)])];
  await syncProductListingReadModelBatch(resyncIds);
  log(`Read models resynced: ${resyncIds.length} product(s)`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    await db.$disconnect();
    process.exit(1);
  });
