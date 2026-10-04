import { db } from "@white-shop/db";

interface AttributeValueCountRow {
  valueId: string;
  count: number;
}

interface AttributeCountRow {
  attributeId: string;
  count: number;
}

/**
 * Counts distinct non-deleted products that use each attribute value
 * via product_variant_options → product_variants.
 */
export async function getAttributeValueProductCountMap(
  valueIds: string[],
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();

  if (valueIds.length === 0) {
    return countMap;
  }

  const rows = await db.$queryRaw<AttributeValueCountRow[]>`
    SELECT
      pvo."valueId" AS "valueId",
      COUNT(DISTINCT pv."productId")::int AS count
    FROM "product_variant_options" pvo
    INNER JOIN "product_variants" pv ON pv.id = pvo."variantId"
    INNER JOIN "products" p ON p.id = pv."productId"
    WHERE p."deletedAt" IS NULL
      AND pvo."valueId" IS NOT NULL
      AND pvo."valueId" = ANY(${valueIds}::text[])
    GROUP BY pvo."valueId"
  `;

  for (const row of rows) {
    countMap.set(row.valueId, row.count);
  }

  return countMap;
}

/**
 * Counts distinct non-deleted products that use any value of each attribute.
 */
export async function getAttributeProductCountMap(
  attributeIds: string[],
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();

  if (attributeIds.length === 0) {
    return countMap;
  }

  const rows = await db.$queryRaw<AttributeCountRow[]>`
    SELECT
      av."attributeId" AS "attributeId",
      COUNT(DISTINCT pv."productId")::int AS count
    FROM "product_variant_options" pvo
    INNER JOIN "product_variants" pv ON pv.id = pvo."variantId"
    INNER JOIN "products" p ON p.id = pv."productId"
    INNER JOIN "attribute_values" av ON av.id = pvo."valueId"
    WHERE p."deletedAt" IS NULL
      AND pvo."valueId" IS NOT NULL
      AND av."attributeId" = ANY(${attributeIds}::text[])
    GROUP BY av."attributeId"
  `;

  for (const row of rows) {
    countMap.set(row.attributeId, row.count);
  }

  return countMap;
}
