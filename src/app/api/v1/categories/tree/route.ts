import { NextRequest, NextResponse } from "next/server";
import { categoriesService } from "@/lib/services/categories.service";
import { cacheService } from "@/lib/services/cache.service";

const CACHE_TTL = 300;
const EMPTY_TREE_RESPONSE = { data: [] as Array<unknown> };

function isDatabaseConfigurationError(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes("Error validating datasource `db`") ||
    detail.includes("env(\"DATABASE_URL\")") ||
    detail.includes("P1001") ||
    detail.includes("Can't reach database server")
  );
}

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
  } catch (error: unknown) {
    if (isDatabaseConfigurationError(error)) {
      console.warn("⚠️ [CATEGORIES] Database is not configured, returning empty category tree");
      return NextResponse.json(EMPTY_TREE_RESPONSE, {
        headers: { "X-Cache": "BYPASS", "X-Data-Source": "fallback" },
      });
    }

    const errorPayload =
      error && typeof error === "object"
        ? (error as {
            type?: string;
            title?: string;
            status?: number;
            detail?: string;
            message?: string;
          })
        : undefined;

    console.error("❌ [CATEGORIES] Error:", error);
    return NextResponse.json(
      {
        type: errorPayload?.type || "https://api.shop.am/problems/internal-error",
        title: errorPayload?.title || "Internal Server Error",
        status: errorPayload?.status || 500,
        detail: errorPayload?.detail || errorPayload?.message || "An error occurred",
        instance: req.url,
      },
      { status: errorPayload?.status || 500 }
    );
  }
}

