import { db } from "@white-shop/db";
import { cacheService } from "@/lib/services/cache.service";
import { processImageUrl } from "@/lib/utils/image-utils";
import { pickCategoryTranslation } from "@/lib/pickCategoryTranslation";

const CACHE_TTL_SECONDS = 300;
export const DEFAULT_TOP_CATEGORY_LIMIT = 5;
export const MAX_TOP_CATEGORY_LIMIT = 100;

export type TopCategoryItem = {
  id: string;
  slug: string;
  title: string;
  productCount: number;
  image?: string | null;
};

export type TopCategoriesPayload = {
  data: TopCategoryItem[];
};

export type TopCategoriesOptions = {
  /** When false, skips the sample-products query (shop sidebar filters). */
  includeImages?: boolean;
};

function parseCategoryLimit(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_TOP_CATEGORY_LIMIT;
  }
  return Math.min(value, MAX_TOP_CATEGORY_LIMIT);
}

function incrementCategoryCount(countMap: Map<string, number>, categoryId: string): void {
  countMap.set(categoryId, (countMap.get(categoryId) || 0) + 1);
}

function buildTopCategoriesCacheKey(
  lang: string,
  limit: number,
  includeImages: boolean,
): string {
  return `categories:top:v2:${lang}:${limit}:${includeImages ? "img" : "noimg"}`;
}

/**
 * Top categories with product counts — shared by GET /api/v1/categories/top and shop RSC.
 */
export async function getCachedTopCategories(
  lang: string,
  limitInput: number,
  options: TopCategoriesOptions = {},
): Promise<{ result: TopCategoriesPayload; cacheStatus: "HIT" | "MISS" }> {
  const limit = parseCategoryLimit(limitInput);
  const includeImages = options.includeImages !== false;
  const cacheKey = buildTopCategoriesCacheKey(lang, limit, includeImages);

  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const data =
      typeof cached === "string"
        ? (JSON.parse(cached) as TopCategoriesPayload)
        : (cached as TopCategoriesPayload);
    return { result: data, cacheStatus: "HIT" };
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
    ...new Set(
      categories.flatMap((cat) => [cat.id, ...cat.children.map((child) => child.id)]),
    ),
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
    const translation = pickCategoryTranslation(cat.translations, lang);
    const parentCount = countMap.get(cat.id) || 0;
    const childrenCount = cat.children.reduce(
      (sum, child) => sum + (countMap.get(child.id) || 0),
      0,
    );
    return [
      {
        id: cat.id,
        slug: translation?.slug || "",
        title: translation?.title || "",
        productCount: parentCount + childrenCount,
      },
      ...cat.children.map((child) => {
        const childTranslation = pickCategoryTranslation(child.translations, lang);
        return {
          id: child.id,
          slug: childTranslation?.slug || "",
          title: childTranslation?.title || "",
          productCount: countMap.get(child.id) || 0,
        };
      }),
    ];
  });

  const topCats = allCats
    .filter((c) => c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, limit);

  const imageMap = new Map<string, string | null>();

  if (includeImages && topCats.length > 0) {
    const topCatIds = topCats.map((c) => c.id);
    const topCatIdSet = new Set(topCatIds);
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

    for (const product of sampleProducts) {
      const img =
        Array.isArray(product.media) && product.media.length > 0
          ? processImageUrl(
              product.media[0] as string | null | undefined | { url?: string; src?: string; value?: string },
            )
          : null;
      if (!img) continue;

      const imageCategoryIds = new Set<string>();
      if (product.primaryCategoryId && topCatIdSet.has(product.primaryCategoryId)) {
        imageCategoryIds.add(product.primaryCategoryId);
      }
      for (const categoryId of product.categoryIds) {
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
  }

  const result: TopCategoriesPayload = {
    data: topCats.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      productCount: c.productCount,
      ...(includeImages ? { image: imageMap.get(c.id) || null } : {}),
    })),
  };

  await cacheService.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
  return { result, cacheStatus: "MISS" };
}
