import { NextRequest, NextResponse } from "next/server";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { getCachedProductFilters } from "@/lib/services/products-filters-cached";
import { logger } from "@/lib/utils/logger";
import { buildProductListFiltersFromUrlSearchParams } from "@/lib/shop/build-shop-product-filters";
import { AppError } from "@/lib/errors/app-error";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    let searchParams: URLSearchParams;
    try {
      searchParams = new URL(req.url || "").searchParams;
    } catch (urlError: unknown) {
      logger.error("Product filters URL parse failed", {
        error: urlError instanceof Error ? urlError.message : String(urlError),
      });
      throw AppError.internal();
    }

    const parsed = buildProductListFiltersFromUrlSearchParams(searchParams);
    const filters = {
      category: parsed.category,
      search: parsed.search,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      lang: parsed.lang,
      brand: parsed.brand,
      colors: parsed.colors,
      sizes: parsed.sizes,
      filter: parsed.filter,
    };

    const { result, cacheStatus } = await getCachedProductFilters(filters);
    return NextResponse.json(result, {
      headers: { "X-Cache": cacheStatus },
    });
  });
}
