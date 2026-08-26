import { NextRequest, NextResponse } from "next/server";
import { getCachedCategoriesTree } from "@/lib/services/categories-tree-cached";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";

    const { result, cacheStatus } = await getCachedCategoriesTree(lang);
    return NextResponse.json(result, {
      headers: { "X-Cache": cacheStatus },
    });
  });
}
