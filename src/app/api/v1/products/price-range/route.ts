import { NextRequest, NextResponse } from "next/server";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { productsService } from "@/lib/services/products.service";
import { buildProductListFiltersFromUrlSearchParams } from "@/lib/shop/build-shop-product-filters";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const filters = buildProductListFiltersFromUrlSearchParams(searchParams);
    const result = await productsService.getPriceRange(filters);
    return NextResponse.json(result);
  });
}
