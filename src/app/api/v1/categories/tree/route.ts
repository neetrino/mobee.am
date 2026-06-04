import { NextRequest, NextResponse } from "next/server";
import { getCachedCategoriesTree } from "@/lib/services/categories-tree-cached";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";

    const { result, cacheStatus } = await getCachedCategoriesTree(lang);
    return NextResponse.json(result, {
      headers: { "X-Cache": cacheStatus },
    });
  } catch (error: unknown) {
    const err = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };
    console.error("❌ [CATEGORIES] Error:", error);
    return NextResponse.json(
      {
        type: err.type || "https://api.shop.am/problems/internal-error",
        title: err.title || "Internal Server Error",
        status: err.status || 500,
        detail: err.detail || err.message || "An error occurred",
        instance: req.url,
      },
      { status: err.status || 500 },
    );
  }
}
