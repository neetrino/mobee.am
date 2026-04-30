import { NextRequest, NextResponse } from "next/server";
import { getCachedProductList } from "@/lib/services/products-list-cached";
import { buildProductListFiltersFromUrlSearchParams } from "@/lib/shop/build-shop-product-filters";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = buildProductListFiltersFromUrlSearchParams(searchParams);

    const { result, cacheStatus } = await getCachedProductList(filters);

    return NextResponse.json(result, {
      headers: { "X-Cache": cacheStatus },
    });
  } catch (error: unknown) {
    const err = error as { type?: string; title?: string; status?: number; detail?: string; message?: string };
    console.error("❌ [PRODUCTS] Error:", error);
    return NextResponse.json(
      {
        type: err.type || "https://api.shop.am/problems/internal-error",
        title: err.title || "Internal Server Error",
        status: err.status || 500,
        detail: err.detail || err.message || "An error occurred",
        instance: req.url,
      },
      { status: err.status || 500 }
    );
  }
}

