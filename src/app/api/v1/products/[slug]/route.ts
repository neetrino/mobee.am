import { NextRequest, NextResponse } from "next/server";
import { getCachedProductBySlug } from "@/lib/services/products-slug-cached";
import { PRODUCT_DETAIL_HTTP_CACHE_CONTROL } from "@/lib/shop/product-detail-cache-key";
import { runApiRoute } from "@/lib/errors/run-api-route";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const { slug } = await params;
    const { result } = await getCachedProductBySlug(slug, lang);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": PRODUCT_DETAIL_HTTP_CACHE_CONTROL,
      },
    });
  });
}
