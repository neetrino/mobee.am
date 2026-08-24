import { NextRequest, NextResponse } from "next/server";
import { findRelatedProducts, resolveRelatedCategoryIds, type RelatedCategorySource } from "@/lib/services/products-related.service";
import { findProductRelatedContextBySlug } from "@/lib/services/products-related-context.service";
import { getCachedProductBySlug } from "@/lib/services/products-slug-cached";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

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

function parseCategoryIds(raw: string | null): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function buildContextFromQuery(
  productId: string | null,
  primaryCategoryId: string | null,
  categoryIds: string[],
): RelatedCategorySource | null {
  const normalizedId = productId?.trim();
  if (!normalizedId) {
    return null;
  }

  return {
    id: normalizedId,
    primaryCategoryId: primaryCategoryId?.trim() || null,
    categoryIds,
  };
}

async function resolveRelatedContext(
  slug: string,
  lang: string,
  queryContext: RelatedCategorySource | null,
): Promise<RelatedCategorySource | null> {
  if (queryContext && resolveRelatedCategoryIds(queryContext).length > 0) {
    return queryContext;
  }

  const productId = queryContext?.id;

  try {
    const { result } = await getCachedProductBySlug(slug, lang);
    if (productId && result.id !== productId) {
      return result;
    }
    if (productId) {
      return {
        id: productId,
        primaryCategoryId: result.primaryCategoryId,
        categoryIds: result.categoryIds,
        categories: result.categories,
      };
    }
    return result;
  } catch (error: unknown) {
    if ((error as { status?: number }).status !== 404) {
      throw error;
    }
  }

  if (lang !== "en") {
    try {
      const { result } = await getCachedProductBySlug(slug, "en");
      if (productId) {
        return {
          id: productId,
          primaryCategoryId: result.primaryCategoryId,
          categoryIds: result.categoryIds,
          categories: result.categories,
        };
      }
      return result;
    } catch (error: unknown) {
      if ((error as { status?: number }).status !== 404) {
        throw error;
      }
    }
  }

  if (productId) {
    return queryContext;
  }

  return findProductRelatedContextBySlug(slug, lang);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const limit = parseLimit(searchParams.get("limit"));

    const queryContext = buildContextFromQuery(
      searchParams.get("productId"),
      searchParams.get("primaryCategoryId"),
      parseCategoryIds(searchParams.get("categoryIds")),
    );

    const currentProduct = await resolveRelatedContext(slug, lang, queryContext);
    if (!currentProduct) {
      return NextResponse.json({ data: [] });
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
      { status: err.status || 500 },
    );
  }
}
