import { NextRequest, NextResponse } from "next/server";
import { db } from "@white-shop/db";
import { productsService } from "@/lib/services/products.service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

type ProductForRelated = Awaited<ReturnType<typeof productsService.findBySlug>>;

/**
 * Admin create/update sets `primaryCategoryId` / `categoryIds` but does not connect the
 * Prisma `categories` many-to-many. Related products must fall back to those fields.
 */
async function getCategorySlugByCategoryId(
  categoryId: string,
  lang: string,
): Promise<string | null> {
  const category = await db.category.findFirst({
    where: { id: categoryId, deletedAt: null, published: true },
    select: { translations: { select: { locale: true, slug: true } } },
  });
  const translations = category?.translations;
  if (!translations?.length) {
    return null;
  }
  const tr = translations.find((t) => t.locale === lang) ?? translations[0];
  const slug = tr?.slug?.trim();
  return slug && slug.length > 0 ? slug : null;
}

async function resolveCategorySlugForRelated(
  product: ProductForRelated,
  lang: string,
): Promise<string | null> {
  const fromRelation = product.categories?.[0]?.slug?.trim();
  if (fromRelation) {
    return fromRelation;
  }
  if (product.primaryCategoryId) {
    const slug = await getCategorySlugByCategoryId(product.primaryCategoryId, lang);
    if (slug) {
      return slug;
    }
  }
  const firstCategoryId = product.categoryIds?.[0];
  if (firstCategoryId) {
    return getCategorySlugByCategoryId(firstCategoryId, lang);
  }
  return null;
}

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

    const primaryCategorySlug = await resolveCategorySlugForRelated(currentProduct, lang);

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
