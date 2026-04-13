import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@white-shop/db';
import { extractMediaUrl } from '@/lib/utils/extractMediaUrl';
import { processImageUrl } from '@/lib/utils/image-utils';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

export interface InstantSearchResult {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  category: string | null;
}

/**
 * Build search filter for instant search (same logic as products-find-query).
 */
function buildSearchWhere(search: string): Prisma.ProductWhereInput {
  const term = search.trim();
  if (!term) return {};
  return {
    OR: [
      {
        translations: {
          some: {
            title: { contains: term, mode: 'insensitive' },
          },
        },
      },
      {
        translations: {
          some: {
            subtitle: { contains: term, mode: 'insensitive' },
          },
        },
      },
      {
        variants: {
          some: {
            sku: { contains: term, mode: 'insensitive' },
          },
        },
      },
    ],
  };
}

/**
 * GET /api/search/instant
 * Query params: q (required), limit (default 8), lang (default en)
 * Returns { results: InstantSearchResult[] }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const lang = searchParams.get('lang') || 'en';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );

    if (!q || q.length === 0) {
      return NextResponse.json(
        { results: [] },
        { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
      );
    }

    const where: Prisma.ProductWhereInput = {
      published: true,
      deletedAt: null,
      ...buildSearchWhere(q),
    };

    const products = await db.product.findMany({
      where,
      take: limit,
      include: {
        translations: true,
        variants: {
          where: { published: true },
          take: 1,
          orderBy: { price: 'asc' },
        },
        categories: {
          include: {
            translations: true,
          },
        },
      },
    });

    const results: InstantSearchResult[] = products.map((product) => {
      const translations = Array.isArray(product.translations) ? product.translations : [];
      const translation =
        translations.find((t: { locale: string }) => t.locale === lang) || translations[0];
      const slug = translation?.slug ?? '';
      const title = translation?.title ?? '';

      const variants = Array.isArray(product.variants) ? product.variants : [];
      const firstVariant = variants[0];
      const price = firstVariant?.price ?? 0;
      const compareAtPrice = firstVariant?.compareAtPrice ?? null;

      let image: string | null = extractMediaUrl(product.media);
      if (!image && firstVariant?.imageUrl) {
        image = processImageUrl(firstVariant.imageUrl);
      }

      const categories = Array.isArray(product.categories) ? product.categories : [];
      const primaryCategory =
        product.primaryCategoryId &&
        categories.find((c: { id: string }) => c.id === product.primaryCategoryId);
      const categoryDoc = primaryCategory || categories[0];
      const categoryTranslations = categoryDoc?.translations
        ? Array.isArray(categoryDoc.translations)
          ? categoryDoc.translations
          : []
        : [];
      const categoryTranslation =
        categoryTranslations.find((t: { locale: string }) => t.locale === lang) ||
        categoryTranslations[0];
      const category = categoryTranslation?.title ?? null;

      return {
        id: product.id,
        slug,
        title,
        price,
        compareAtPrice,
        image,
        category,
      };
    });

    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  } catch (error) {
    console.error('[search/instant] Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        results: [],
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  }
}
