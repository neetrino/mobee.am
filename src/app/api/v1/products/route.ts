import { NextRequest, NextResponse } from "next/server";
import { productsService } from "@/lib/services/products.service";
import { cacheService } from "@/lib/services/cache.service";

const PRODUCTS_CACHE_TTL = 120; // 2 minutes
const FEATURED_CACHE_TTL = 600; // 10 minutes for home featured tabs (new/bestseller/featured)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = {
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      filter: searchParams.get("filter") || searchParams.get("filters") || undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      colors: searchParams.get("colors") || undefined,
      sizes: searchParams.get("sizes") || undefined,
      brand: searchParams.get("brand") || undefined,
      sort: searchParams.get("sort") || "createdAt",
      page: searchParams.get("page")
        ? parseInt(searchParams.get("page")!)
        : 1,
      limit: Math.min(
        searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 12,
        200
      ),
      lang: searchParams.get("lang") || "en",
    };

    const cacheKey = `products:${searchParams.toString()}`;
    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json(data, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const result = await productsService.findAll(filters);

    const onlyFeatured =
      filters.filter &&
      ["new", "bestseller", "featured"].includes(filters.filter) &&
      !filters.category &&
      !filters.search &&
      (filters.limit ?? 12) <= 24;
    const ttl = onlyFeatured ? FEATURED_CACHE_TTL : PRODUCTS_CACHE_TTL;
    await cacheService.setex(cacheKey, ttl, JSON.stringify(result));

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
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

