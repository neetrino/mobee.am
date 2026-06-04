import { db } from "@white-shop/db";
import { resolveCartLineProductImageUrl } from "../cart/resolveCartLineProductImage";
import { PRODUCT_VARIANT_DB_SELECT } from "../database/productVariantDb.constants";

export interface GuestCartHydrateRequestItem {
  productSlug: string;
  variantId: string;
  quantity: number;
}

export interface GuestCartHydrateLine {
  variantId: string;
  productId: string;
  productSlug: string;
  title: string;
  image: string | null;
  sku: string;
  stock: number;
  price: number;
  originalPrice: number | null;
  quantity: number;
}

interface ProductRow {
  id: string;
  media: unknown;
  translations: Array<{ locale: string; title: string; slug: string }>;
  variants: Array<{
    id: string;
    sku: string | null;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    imageUrl: string | null;
  }>;
}

function resolveProductSlug(product: ProductRow, lang: string): string {
  const preferred = product.translations.find((entry) => entry.locale === lang);
  return preferred?.slug ?? product.translations[0]?.slug ?? "";
}

function resolveProductTitle(product: ProductRow, lang: string): string {
  const preferred = product.translations.find((entry) => entry.locale === lang);
  return preferred?.title ?? product.translations[0]?.title ?? "";
}

function buildSlugIndex(products: ProductRow[], lang: string): Map<string, ProductRow> {
  const index = new Map<string, ProductRow>();
  for (const product of products) {
    for (const translation of product.translations) {
      if (translation.slug) {
        index.set(translation.slug, product);
      }
    }
    const resolvedSlug = resolveProductSlug(product, lang);
    if (resolvedSlug) {
      index.set(resolvedSlug, product);
    }
  }
  return index;
}

class GuestCartHydrateService {
  async hydrateItems(
    items: GuestCartHydrateRequestItem[],
    lang: string = "en",
  ): Promise<{ lines: GuestCartHydrateLine[]; missingSlugs: string[] }> {
    const normalized = items
      .map((item) => ({
        productSlug: item.productSlug.trim(),
        variantId: item.variantId,
        quantity: item.quantity,
      }))
      .filter((item) => item.productSlug.length > 0 && item.variantId.length > 0);

    if (normalized.length === 0) {
      return { lines: [], missingSlugs: [] };
    }

    const uniqueSlugs = [...new Set(normalized.map((item) => item.productSlug))];
    const products = (await db.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        translations: {
          some: {
            slug: { in: uniqueSlugs },
          },
        },
      },
      select: {
        id: true,
        media: true,
        translations: {
          where: {
            slug: { in: uniqueSlugs },
          },
          select: {
            locale: true,
            title: true,
            slug: true,
          },
        },
        variants: {
          where: { published: true },
          select: PRODUCT_VARIANT_DB_SELECT,
        },
      },
    })) as ProductRow[];

    const slugIndex = buildSlugIndex(products, lang);
    const lines: GuestCartHydrateLine[] = [];
    const missingSlugs: string[] = [];

    for (const item of normalized) {
      const product = slugIndex.get(item.productSlug);
      if (!product) {
        missingSlugs.push(item.productSlug);
        continue;
      }

      const variant = product.variants.find((entry) => entry.id === item.variantId);
      if (!variant) {
        missingSlugs.push(item.productSlug);
        continue;
      }

      const image = resolveCartLineProductImageUrl(
        { media: product.media },
        { imageUrl: variant.imageUrl },
      );
      const originalPrice =
        variant.compareAtPrice != null && variant.compareAtPrice > variant.price
          ? Number(variant.compareAtPrice)
          : null;

      lines.push({
        variantId: variant.id,
        productId: product.id,
        productSlug: resolveProductSlug(product, lang) || item.productSlug,
        title: resolveProductTitle(product, lang),
        image,
        sku: variant.sku ?? "",
        stock: variant.stock,
        price: variant.price,
        originalPrice,
        quantity: item.quantity,
      });
    }

    return { lines, missingSlugs };
  }
}

export const guestCartHydrateService = new GuestCartHydrateService();
