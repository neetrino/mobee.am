import { NextRequest, NextResponse } from "next/server";
import { buildProductListCacheControlHeader } from "@/lib/performance/product-list-http-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { getCachedProductList } from "@/lib/services/products-list-cached";
import { buildProductListFiltersFromUrlSearchParams } from "@/lib/shop/build-shop-product-filters";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const filters = buildProductListFiltersFromUrlSearchParams(searchParams);
    const { result, cacheStatus } = await getCachedProductList(filters);
    const cacheControl = buildProductListCacheControlHeader(filters);
    return NextResponse.json(result, {
      headers: {
        "X-Cache": cacheStatus,
        "Cache-Control": cacheControl,
      },
    });
  });
}
