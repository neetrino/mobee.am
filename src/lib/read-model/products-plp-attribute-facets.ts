import { fetchAttributeFacetLightRows } from "@/lib/catalog/fetch-attribute-facet-rows";
import {
  collectAttributeFacetEntries,
  type AttributeFacetEntry,
} from "@/lib/catalog/catalog-attribute-facets";

export type ListingAttributeFacetSource = {
  productId: string;
  attributeFacets: AttributeFacetEntry[] | null;
};

/**
 * Per-product attribute facet entries in input order. Rows synced before the
 * `attributeFacets` projection existed (null) are computed from live variants.
 */
export async function resolveListingAttributeFacetEntries(
  rows: readonly ListingAttributeFacetSource[],
  lang: string,
): Promise<AttributeFacetEntry[][]> {
  const missingIds = rows
    .filter((row) => row.attributeFacets === null)
    .map((row) => row.productId);

  const liveById = new Map<string, AttributeFacetEntry[]>();
  if (missingIds.length > 0) {
    const lightRows = await fetchAttributeFacetLightRows(missingIds);
    for (const lightRow of lightRows) {
      liveById.set(lightRow.id, collectAttributeFacetEntries(lightRow.variants, lang));
    }
  }

  return rows.map((row) => row.attributeFacets ?? liveById.get(row.productId) ?? []);
}
