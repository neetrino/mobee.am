import { NextRequest, NextResponse } from "next/server";
import { productsService } from "@/lib/services/products.service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const limit = parseLimit(searchParams.get("limit"));

    const currentProduct = await productsService.findBySlug(slug, lang);
    const primaryCategorySlug = currentProduct.categories?.[0]?.slug;

    if (!primaryCategorySlug) {
      return NextResponse.json({ data: [] });
    }

    const relatedResponse = await productsService.findAll({
      category: primaryCategorySlug,
      limit: Math.min(limit + 1, MAX_LIMIT),
      page: 1,
      lang,
    });

    const data = relatedResponse.data
      .filter((product) => product.id !== currentProduct.id)
      .slice(0, limit);

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };

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
