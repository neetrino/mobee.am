import type { Prisma } from "@white-shop/db";
import type { ProductFilters } from "@/lib/services/products-find-query/types";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { loadProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { adminSettingsService } from "@/lib/services/admin/admin-settings.service";
import { normalizeCatalogQuery, type CanonicalCatalogQuery } from "./catalog-query";
import {
  buildCatalogWhere,
  CATALOG_FACET_WHERE_SCOPE,
  type CatalogWhereResult,
} from "./build-catalog-where";
import { buildCategoryTreesOrWhere } from "@/lib/services/products-find-query/category-utils";
import { resolveBrandIds } from "./brand-where";
import { getBestsellerProductIdsRanked } from "./bestsellers";
import { fetchCatalogLightRows } from "./fetch-catalog-light-rows";
import type { CatalogLightRow } from "./catalog-light.types";
import { selectFacetRows } from "./catalog-facet-match";
import {
  aggregateBrandFacets,
  aggregateColorFacets,
  aggregateSizeFacets,
  computeCatalogPriceBounds,
  type CatalogBrandFacet,
  type CatalogColorFacet,
  type CatalogPriceBounds,
  type CatalogSizeFacet,
} from "./catalog-facet-aggregate";

export type CatalogFacetsResult = {
  colors: CatalogColorFacet[];
  sizes: CatalogSizeFacet[];
  brands: CatalogBrandFacet[];
  priceRange: CatalogPriceBounds & {
    stepSize: number | null;
    stepSizePerCurrency: Record<string, number | undefined> | null;
  };
};

export type CatalogFacetsPort = {
  buildWhere: (
    query: CanonicalCatalogQuery,
  ) => Promise<CatalogWhereResult>;
  fetchLightRows: (where: Prisma.ProductWhereInput) => Promise<CatalogLightRow[]>;
  loadDiscounts: () => Promise<ProductDiscountContext>;
  loadPriceFilterSettings: () => Promise<{
    stepSize: number | null;
    stepSizePerCurrency: Record<string, number | undefined> | null;
  }>;
};

const emptyBounds: CatalogPriceBounds = { min: 0, max: 0, hasProducts: false };

function emptyFacets(
  stepSize: number | null,
  stepSizePerCurrency: Record<string, number | undefined> | null,
): CatalogFacetsResult {
  return {
    colors: [],
    sizes: [],
    brands: [],
    priceRange: { ...emptyBounds, stepSize, stepSizePerCurrency },
  };
}

const defaultPort: CatalogFacetsPort = {
  buildWhere: (query) =>
    buildCatalogWhere(
      query,
      {
        resolveBrands: resolveBrandIds,
        resolveCategory: buildCategoryTreesOrWhere,
        bestsellers: getBestsellerProductIdsRanked,
      },
      CATALOG_FACET_WHERE_SCOPE,
    ),
  fetchLightRows: (where) => fetchCatalogLightRows(where, "facets"),
  loadDiscounts: loadProductDiscountContext,
  loadPriceFilterSettings: async () => {
    const settings = await adminSettingsService.getPriceFilterSettings();
    return {
      stepSize: settings.stepSize ?? null,
      stepSizePerCurrency: settings.stepSizePerCurrency
        ? {
            USD: settings.stepSizePerCurrency.USD ?? undefined,
            AMD: settings.stepSizePerCurrency.AMD ?? undefined,
            RUB: settings.stepSizePerCurrency.RUB ?? undefined,
            GEL: settings.stepSizePerCurrency.GEL ?? undefined,
          }
        : null,
    };
  },
};

/**
 * Facets share catalog semantics including filter=new|featured|bestseller.
 * Brand/color/size counts omit only their own filter dimension.
 */
export async function getCatalogFacets(
  filters: ProductFilters,
  port: CatalogFacetsPort = defaultPort,
): Promise<CatalogFacetsResult> {
  const query = normalizeCatalogQuery(filters);
  let stepSize: number | null = null;
  let stepSizePerCurrency: Record<string, number | undefined> | null = null;
  try {
    const settings = await port.loadPriceFilterSettings();
    stepSize = settings.stepSize;
    stepSizePerCurrency = settings.stepSizePerCurrency;
  } catch {
    stepSize = null;
    stepSizePerCurrency = null;
  }

  const { where } = await port.buildWhere(query);
  if (where === null) {
    return emptyFacets(stepSize, stepSizePerCurrency);
  }

  const [rows, discounts] = await Promise.all([
    port.fetchLightRows(where),
    port.loadDiscounts(),
  ]);

  const priceRows = selectFacetRows(rows, query, discounts, "price");
  const brandRows = selectFacetRows(rows, query, discounts, "brand");
  const colorRows = selectFacetRows(rows, query, discounts, "colors");
  const sizeRows = selectFacetRows(rows, query, discounts, "sizes");
  const bounds = computeCatalogPriceBounds(priceRows, discounts);

  return {
    colors: aggregateColorFacets(colorRows, query.lang),
    sizes: aggregateSizeFacets(sizeRows, query.lang),
    brands: aggregateBrandFacets(brandRows, query.lang),
    priceRange: { ...bounds, stepSize, stepSizePerCurrency },
  };
}
