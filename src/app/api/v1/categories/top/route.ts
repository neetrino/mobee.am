import { NextRequest, NextResponse } from "next/server";
import { db } from "@white-shop/db";
import { cacheService } from "@/lib/services/cache.service";
import { processImageUrl } from "@/lib/utils/image-utils";

const CACHE_TTL = 300; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const limitParam = parseInt(searchParams.get("limit") || "5", 10);
    const limit = Math.min(limitParam, 20);

    const cacheKey = `categories:top:${lang}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json(data, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const categories = await db.category.findMany({
      where: { parentId: null },
      include: {
        translations: true,
        children: {
          include: { translations: true },
        },
      },
    });

    const allCategoryIds = categories.flatMap((cat) => [
      cat.id,
      ...cat.children.map((child) => child.id),
    ]);

    const counts = await db.product.groupBy({
      by: ["primaryCategoryId"],
      where: {
        published: true,
        deletedAt: null,
        primaryCategoryId: { in: allCategoryIds },
      },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const row of counts) {
      if (row.primaryCategoryId) {
        countMap.set(row.primaryCategoryId, row._count.id);
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
        primaryCategoryId: { in: topCatIds },
      },
      select: {
        primaryCategoryId: true,
        media: true,
      },
      take: topCatIds.length * 3,
    });

    const imageMap = new Map<string, string | null>();
    for (const p of sampleProducts) {
      if (!p.primaryCategoryId || imageMap.has(p.primaryCategoryId)) continue;
      const img = Array.isArray(p.media) && p.media.length > 0
        ? processImageUrl(p.media[0] as string | null | undefined | { url?: string; src?: string; value?: string })
        : null;
      if (img) imageMap.set(p.primaryCategoryId, img);
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
