import { db } from "@white-shop/db";
import type { CatalogLightRow, CatalogLightVariant } from "./catalog-light.types";

const ATTRIBUTE_FACET_PRODUCT_BATCH_SIZE = 400;

/**
 * Load minimal product→variant→option rows for generic attribute facets.
 * Batched to avoid oversized `id IN (...)` queries on large catalogs.
 */
export async function fetchAttributeFacetLightRows(
  productIds: string[],
): Promise<CatalogLightRow[]> {
  if (productIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const byProduct = new Map<string, CatalogLightVariant[]>();

  for (let index = 0; index < uniqueIds.length; index += ATTRIBUTE_FACET_PRODUCT_BATCH_SIZE) {
    const chunk = uniqueIds.slice(index, index + ATTRIBUTE_FACET_PRODUCT_BATCH_SIZE);
    const variants = await db.productVariant.findMany({
      where: {
        published: true,
        productId: { in: chunk },
      },
      select: {
        productId: true,
        price: true,
        attributes: true,
        options: {
          select: {
            attributeKey: true,
            value: true,
            attributeValue: {
              select: {
                value: true,
                attribute: { select: { key: true } },
                translations: { select: { locale: true, label: true } },
              },
            },
          },
        },
      },
    });

    for (const variant of variants) {
      const list = byProduct.get(variant.productId) ?? [];
      list.push({
        price: variant.price,
        attributes: variant.attributes,
        options: variant.options,
      });
      byProduct.set(variant.productId, list);
    }
  }

  const rows: CatalogLightRow[] = [];
  for (const productId of uniqueIds) {
    const variants = byProduct.get(productId);
    if (!variants || variants.length === 0) continue;
    rows.push({
      id: productId,
      createdAt: new Date(0),
      variants,
    });
  }
  return rows;
}
