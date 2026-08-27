import { db } from "@white-shop/db";
import type { Prisma } from "@white-shop/db";
import { buildSearchWhere } from "@/lib/catalog/search-where";
import { localizeCategoryTitle } from "@/lib/category-title-i18n";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/language";
import { pickCategoryTranslation } from "@/lib/pickCategoryTranslation";
import { hasDisplayPrice, pickListingPriceVariant } from "@/lib/products/variant-price-display";
import { isProductListingReadModelReady } from "@/lib/read-model/read-model-ready";
import { extractMediaUrl } from "@/lib/utils/extractMediaUrl";
import { processImageUrl } from "@/lib/utils/image-utils";

export const INSTANT_SEARCH_DEFAULT_LIMIT = 8;
export const INSTANT_SEARCH_MAX_LIMIT = 20;

export type InstantSearchResult = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  hasPrice: boolean;
  compareAtPrice: number | null;
  image: string | null;
  category: string | null;
};

type ListingHit = {
  productId: string;
  slug: string;
  title: string;
  price: number;
  hasPrice: boolean;
  compareAtPrice: number | null;
  image: string | null;
  primaryCategoryId: string | null;
  categoryIds: string[];
};

export function parseInstantSearchLimit(raw: string | null): number {
  const parsed = parseInt(raw ?? String(INSTANT_SEARCH_DEFAULT_LIMIT), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return INSTANT_SEARCH_DEFAULT_LIMIT;
  }
  return Math.min(parsed, INSTANT_SEARCH_MAX_LIMIT);
}

export function parseInstantSearchLang(raw: string | null): LanguageCode {
  if (raw === "hy" || raw === "en" || raw === "ru") {
    return raw;
  }
  if (raw === "ka") {
    return "en";
  }
  return DEFAULT_LANGUAGE;
}

function listingSearchWhere(
  term: string,
  locale: LanguageCode,
): Prisma.ProductListingRowWhereInput {
  return {
    locale,
    isPublished: true,
    deletedAt: null,
    OR: [
      { searchText: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
    ],
  };
}

async function loadCategoryTitlesById(
  ids: string[],
  lang: LanguageCode,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  if (unique.length === 0) {
    return new Map();
  }
  const rows = await db.categoryTranslation.findMany({
    where: { categoryId: { in: unique }, locale: lang },
    select: { categoryId: true, title: true },
  });
  return new Map(
    rows.map((row) => [row.categoryId, localizeCategoryTitle(row.title, lang)]),
  );
}

function mapListingHit(
  row: ListingHit,
  titles: Map<string, string>,
): InstantSearchResult {
  const categoryId = row.primaryCategoryId ?? row.categoryIds[0] ?? "";
  return {
    id: row.productId,
    slug: row.slug,
    title: row.title,
    price: row.hasPrice ? row.price : null,
    hasPrice: row.hasPrice,
    compareAtPrice: row.hasPrice ? row.compareAtPrice : null,
    image: row.image,
    category: categoryId ? titles.get(categoryId) ?? null : null,
  };
}

async function searchListingRows(
  term: string,
  lang: LanguageCode,
  limit: number,
): Promise<InstantSearchResult[]> {
  const rows = await db.productListingRow.findMany({
    where: listingSearchWhere(term, lang),
    take: limit,
    orderBy: [{ hasMarcoListingImage: "asc" }, { productCreatedAt: "desc" }],
    select: {
      productId: true,
      slug: true,
      title: true,
      price: true,
      hasPrice: true,
      compareAtPrice: true,
      image: true,
      primaryCategoryId: true,
      categoryIds: true,
    },
  });
  const titles = await loadCategoryTitlesById(
    rows.map((row) => row.primaryCategoryId ?? row.categoryIds[0] ?? ""),
    lang,
  );
  return rows.map((row) => mapListingHit(row, titles));
}

function mapProductHit(
  product: {
    id: string;
    media: unknown;
    primaryCategoryId: string | null;
    translations: Array<{ locale: string; slug: string; title: string }>;
    variants: Array<{
      price: number | null;
      priceOnRequest: boolean | null;
      compareAtPrice: number | null;
      imageUrl: string | null;
    }>;
    categories: Array<{
      id: string;
      translations: Array<{ locale: string; title: string }>;
    }>;
  },
  lang: LanguageCode,
): InstantSearchResult {
  const translation =
    product.translations.find((row) => row.locale === lang) ?? product.translations[0];
  const pricedVariant = pickListingPriceVariant(product.variants);
  const variantHasPrice = hasDisplayPrice(pricedVariant);
  const primary =
    product.categories.find((category) => category.id === product.primaryCategoryId) ??
    product.categories[0];
  const categoryTranslation = primary
    ? pickCategoryTranslation(primary.translations, lang)
    : undefined;
  const image =
    extractMediaUrl(product.media) || processImageUrl(pricedVariant?.imageUrl ?? null);

  return {
    id: product.id,
    slug: translation?.slug ?? "",
    title: translation?.title ?? "",
    price: variantHasPrice ? pricedVariant!.price : null,
    hasPrice: variantHasPrice,
    compareAtPrice: variantHasPrice ? pricedVariant?.compareAtPrice ?? null : null,
    image,
    category: categoryTranslation
      ? localizeCategoryTitle(categoryTranslation.title, lang)
      : null,
  };
}

async function searchProductsFallback(
  term: string,
  lang: LanguageCode,
  limit: number,
): Promise<InstantSearchResult[]> {
  const products = await db.product.findMany({
    where: {
      published: true,
      deletedAt: null,
      ...buildSearchWhere(term),
    },
    take: limit,
    select: {
      id: true,
      media: true,
      primaryCategoryId: true,
      translations: { select: { locale: true, slug: true, title: true } },
      variants: {
        where: { published: true },
        select: {
          price: true,
          priceOnRequest: true,
          compareAtPrice: true,
          imageUrl: true,
        },
      },
      categories: {
        select: {
          id: true,
          translations: { select: { locale: true, title: true } },
        },
      },
    },
  });
  return products.map((product) => mapProductHit(product, lang));
}

/**
 * Instant header search: listing read model first, live product query only if empty.
 */
export async function findInstantSearchResults(input: {
  q: string;
  lang: LanguageCode;
  limit: number;
}): Promise<InstantSearchResult[]> {
  const term = input.q.trim();
  if (!term) {
    return [];
  }
  if (await isProductListingReadModelReady()) {
    return searchListingRows(term, input.lang, input.limit);
  }
  return searchProductsFallback(term, input.lang, input.limit);
}
