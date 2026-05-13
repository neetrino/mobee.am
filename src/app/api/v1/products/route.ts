import { NextRequest, NextResponse } from "next/server";
import { buildProductListCacheControlHeader } from "@/lib/performance/product-list-http-cache";
import { getCachedProductList } from "@/lib/services/products-list-cached";
import { buildProductListFiltersFromUrlSearchParams } from "@/lib/shop/build-shop-product-filters";

function isDatabaseConfigurationError(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes("Error validating datasource `db`") ||
    detail.includes("env(\"DATABASE_URL\")") ||
    detail.includes("Invalid `prisma.") ||
    detail.includes("PrismaClientInitializationError") ||
    detail.includes("P1001") ||
    detail.includes("Can't reach database server")
  );
}

export async function GET(req: NextRequest) {
  try {
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
  } catch (error: unknown) {
    if (isDatabaseConfigurationError(error)) {
      const { searchParams } = new URL(req.url);
      const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
      const limitParam = Number.parseInt(searchParams.get("limit") ?? "12", 10);
      const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 12;

      return NextResponse.json(
        {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        },
        {
          headers: { "X-Cache": "BYPASS", "X-Data-Source": "fallback" },
        }
      );
    }

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

