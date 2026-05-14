import { NextRequest, NextResponse } from "next/server";
import { db } from "@white-shop/db";
import { cacheService } from "@/lib/services/cache.service";
import { processImageUrl } from "@/lib/utils/image-utils";

const CACHE_TTL = 300; // 5 minutes
const DEFAULT_TOP_CATEGORY_LIMIT = 5;
const MAX_TOP_CATEGORY_LIMIT = 100;

function parseCategoryLimit(value: string | null): number {
  const parsedLimit = Number.parseInt(value || String(DEFAULT_TOP_CATEGORY_LIMIT), 10);
  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_TOP_CATEGORY_LIMIT;
  }

  return Math.min(parsedLimit, MAX_TOP_CATEGORY_LIMIT);
}

function incrementCategoryCount(countMap: Map<string, number>, categoryId: string): void {
  countMap.set(categoryId, (countMap.get(categoryId) || 0) + 1);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const limit = parseCategoryLimit(searchParams.get("limit"));

    const cacheKey = `categories:top:${lang}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json(data, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const categories = await db.category.findMany({
      where: {
        parentId: null,
        published: true,
        deletedAt: null,
      },
      include: {
        translations: true,
        children: {
          where: {
            published: true,
            deletedAt: null,
          },
          include: { translations: true },
        },
      },
    });

    const allCategoryIds = [
      ...new Set(categories.flatMap((cat) => [
        cat.id,
        ...cat.children.map((child) => child.id),
      ])),
    ];
    const allCategoryIdSet = new Set(allCategoryIds);

    const productsWithCategories = await db.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        OR: [
          { primaryCategoryId: { in: allCategoryIds } },
          { categoryIds: { hasSome: allCategoryIds } },
        ],
      },
      select: {
        primaryCategoryId: true,
        categoryIds: true,
      },
    });

    const countMap = new Map<string, number>();
    for (const product of productsWithCategories) {
      const productCategoryIds = new Set<string>();
      if (product.primaryCategoryId && allCategoryIdSet.has(product.primaryCategoryId)) {
        productCategoryIds.add(product.primaryCategoryId);
      }
      for (const categoryId of product.categoryIds) {
        if (allCategoryIdSet.has(categoryId)) {
          productCategoryIds.add(categoryId);
        }
      }
      for (const categoryId of productCategoryIds) {
        incrementCategoryCount(countMap, categoryId);
      }
    }

    const allCats = categories.flatMap((cat) => {
      const t =
        cat.translations.find((tr) => tr.locale === lang) ||
        cat.translations[0];
      const parentCount = countMap.get(cat.id) || 0;
      const childrenCount = cat.children.reduce(
        (sum, child) => sum + (countMap.get(child.id) || 0),
        0
      );
      return [
        {
          id: cat.id,
          slug: t?.slug || "",
          title: t?.title || "",
          productCount: parentCount + childrenCount,
        },
        ...cat.children.map((child) => {
          const ct =
            child.translations.find((tr) => tr.locale === lang) ||
            child.translations[0];
          return {
            id: child.id,
            slug: ct?.slug || "",
            title: ct?.title || "",
            productCount: countMap.get(child.id) || 0,
          };
        }),
      ];
    });

    const topCats = allCats
      .filter((c) => c.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, limit);

    const topCatIds = topCats.map((c) => c.id);
    const sampleProducts = await db.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        OR: [
          { primaryCategoryId: { in: topCatIds } },
          { categoryIds: { hasSome: topCatIds } },
        ],
      },
      select: {
        primaryCategoryId: true,
        categoryIds: true,
        media: true,
      },
      take: topCatIds.length * 3,
    });

    const topCatIdSet = new Set(topCatIds);
    const imageMap = new Map<string, string | null>();
    for (const p of sampleProducts) {
      const img = Array.isArray(p.media) && p.media.length > 0
        ? processImageUrl(p.media[0] as string | null | undefined | { url?: string; src?: string; value?: string })
        : null;
      if (!img) continue;

      const imageCategoryIds = new Set<string>();
      if (p.primaryCategoryId && topCatIdSet.has(p.primaryCategoryId)) {
        imageCategoryIds.add(p.primaryCategoryId);
      }
      for (const categoryId of p.categoryIds) {
        if (topCatIdSet.has(categoryId)) {
          imageCategoryIds.add(categoryId);
        }
      }
      for (const categoryId of imageCategoryIds) {
        if (!imageMap.has(categoryId)) {
          imageMap.set(categoryId, img);
        }
      }
    }

    const result = {
      data: topCats.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        productCount: c.productCount,
        image: imageMap.get(c.id) || null,
      })),
    };

    await cacheService.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error: unknown) {
    const err = error as { type?: string; title?: string; status?: number; detail?: string; message?: string };
    console.error("❌ [TOP CATEGORIES] Error:", error);
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
