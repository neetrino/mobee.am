import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_TOP_CATEGORY_LIMIT,
  getCachedTopCategories,
  MAX_TOP_CATEGORY_LIMIT,
} from "@/lib/services/categories-top-cached";
import { runApiRoute } from "@/lib/errors/run-api-route";

function parseCategoryLimit(value: string | null): number {
  const parsedLimit = Number.parseInt(value || String(DEFAULT_TOP_CATEGORY_LIMIT), 10);
  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_TOP_CATEGORY_LIMIT;
  }
  return Math.min(parsedLimit, MAX_TOP_CATEGORY_LIMIT);
}

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const limit = parseCategoryLimit(searchParams.get("limit"));
    const includeImages = searchParams.get("includeImages") !== "false";

    const { result, cacheStatus } = await getCachedTopCategories(lang, limit, { includeImages });

    return NextResponse.json(result, {
      headers: { "X-Cache": cacheStatus },
    });
  });
}
