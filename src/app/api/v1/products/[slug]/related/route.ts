import { NextRequest, NextResponse } from "next/server";
import { productsService } from "@/lib/services/products.service";
import { findRelatedProducts } from "@/lib/services/products-related.service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

type ProductForRelated = Awaited<ReturnType<typeof productsService.findBySlug>>;

export const dynamic = "force-dynamic";

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

    let currentProduct: ProductForRelated;
    try {
      currentProduct = await productsService.findBySlug(slug, lang);
    } catch (loadError: unknown) {
      const status = (loadError as { status?: number }).status;
      if (status === 404) {
        return NextResponse.json({ data: [] });
      }
      throw loadError;
    }

    const data = await findRelatedProducts({
      product: currentProduct,
      lang,
      limit,
    });

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
