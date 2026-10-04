import { db } from "@white-shop/db";
import type { CatalogAttributeMeta } from "./catalog-facet-aggregate";

/**
 * Load attribute metadata (names + order) for shop facet sections.
 * Includes all attributes — visibility is decided by what products actually use.
 */
export async function loadFilterableAttributeMeta(
  lang: string,
): Promise<Map<string, CatalogAttributeMeta>> {
  const rows = await db.attribute.findMany({
    select: {
      key: true,
      position: true,
      filterable: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
    orderBy: { position: "asc" },
  });

  const map = new Map<string, CatalogAttributeMeta>();
  for (const row of rows) {
    const key = row.key.trim().toLowerCase();
    if (!key) continue;
    const translation =
      row.translations.find((item) => item.locale === lang)?.name?.trim() ||
      row.translations[0]?.name?.trim() ||
      key;
    map.set(key, {
      key,
      name: translation,
      position: row.position,
      filterable: row.filterable,
    });
  }
  return map;
}
