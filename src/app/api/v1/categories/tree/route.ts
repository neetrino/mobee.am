import { NextRequest, NextResponse } from "next/server";
import { categoriesService } from "@/lib/services/categories.service";
import { cacheService } from "@/lib/services/cache.service";

const CACHE_TTL = 300;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const cacheKey = `categories:tree:${lang}`;
    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json(data, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const result = await categoriesService.getTree(lang);
    await cacheService.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error: any) {
    console.error("❌ [CATEGORIES] Error:", error);
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

