import { NextRequest, NextResponse } from "next/server";
import { runApiRoute } from "@/lib/errors/run-api-route";
import {
  findInstantSearchResults,
  parseInstantSearchLang,
  parseInstantSearchLimit,
} from "@/lib/search/instant-search";

const NO_STORE = { "Cache-Control": "no-store, must-revalidate" };

/**
 * GET /api/v1/search/instant
 * Query params: q (required), limit (default 8), lang (default hy)
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const lang = parseInstantSearchLang(searchParams.get("lang"));
    const limit = parseInstantSearchLimit(searchParams.get("limit"));

    if (!q) {
      return NextResponse.json({ results: [] }, { headers: NO_STORE });
    }

    const results = await findInstantSearchResults({ q, lang, limit });
    return NextResponse.json({ results }, { headers: NO_STORE });
  });
}
