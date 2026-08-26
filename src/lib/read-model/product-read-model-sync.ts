import { db, Prisma } from "@white-shop/db";
import { loadProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { PRODUCT_VARIANT_SELECT_WITH_OPTIONS_FULL } from "@/lib/database/productVariantDb.constants";
import {
  buildProductListingRowsForLocales,
  type CategoryAncestry,
} from "@/lib/read-model/product-listing-row-builder";
import {
  deleteProductPdpReadModel,
  rebuildProductPdpReadModel,
  syncProductPdpReadModel,
  syncProductPdpReadModelBatch,
} from "@/lib/read-model/product-pdp-read-model-sync";
import { invalidateProductReadCaches } from "@/lib/services/read-through-json-cache";
import { PRODUCT_LISTING_READ_MODEL_DEFAULT_LOCALES } from "@/lib/read-model/product-read-model-locales";
import {
  markProductListingReadModelReady,
  invalidateProductListingReadModelReadyMemo,
} from "@/lib/read-model/read-model-ready";

const DEFAULT_LISTING_BATCH_SIZE = 100;

function normalizeLocales(locales: readonly string[] | undefined): string[] {
  const source = locales?.length ? locales : PRODUCT_LISTING_READ_MODEL_DEFAULT_LOCALES;
  return [...new Set(source.map((locale) => locale.trim().toLowerCase()).filter(Boolean))];
}

async function loadCategoryAncestry(): Promise<CategoryAncestry> {
  const categories = await db.category.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      parentId: true,
      translations: { select: { locale: true, slug: true } },
    },
  });
  const parentById = new Map<string, string | null>();
  const slugByIdLocale = new Map<string, string>();
  for (const category of categories) {
    parentById.set(category.id, category.parentId ?? null);
    for (const translation of category.translations) {
      const slug = translation.slug?.trim();
      if (slug) slugByIdLocale.set(`${category.id}:${translation.locale}`, slug);
    }
  }
  return { parentById, slugByIdLocale };
}

const listingSelect = {
  id: true,
  brandId: true,
  primaryCategoryId: true,
  categoryIds: true,
  media: true,
  featured: true,
  discountPercent: true,
  warrantyYears: true,
  published: true,
  publishedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  translations: {
    select: { locale: true, title: true, slug: true, subtitle: true },
  },
  brand: {
    select: {
      id: true,
      slug: true,
      translations: { select: { locale: true, name: true } },
    },
  },
  variants: {
    where: { published: true },
    select: {
      ...PRODUCT_VARIANT_SELECT_WITH_OPTIONS_FULL,
      media: true,
    },
  },
  labels: true,
} as const;

function toListingCreateManyData(
  product: Parameters<typeof buildProductListingRowsForLocales>[0],
  locales: string[],
  discounts: Awaited<ReturnType<typeof loadProductDiscountContext>>,
  ancestry: CategoryAncestry,
) {
  return buildProductListingRowsForLocales(product, locales, discounts, ancestry).map((row) => ({
    ...row,
    labels: (row.labels ?? []) as Prisma.InputJsonValue,
    colors: row.colors as Prisma.InputJsonValue,
  }));
}

async function replaceListingRowsForProduct(
  productId: string,
  locales: string[],
  discounts: Awaited<ReturnType<typeof loadProductDiscountContext>>,
  ancestry: CategoryAncestry,
): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: listingSelect,
  });
  await db.productListingRow.deleteMany({ where: { productId } });
  if (!product) return;
  const data = toListingCreateManyData(product, locales, discounts, ancestry);
  if (data.length === 0) return;
  await db.productListingRow.createMany({ data });
}

async function insertListingRowsForProductIds(
  productIds: string[],
  locales: string[],
  discounts: Awaited<ReturnType<typeof loadProductDiscountContext>>,
  ancestry: CategoryAncestry,
): Promise<void> {
  if (productIds.length === 0) return;
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: listingSelect,
  });
  const data = products.flatMap((product) =>
    toListingCreateManyData(product, locales, discounts, ancestry),
  );
  if (data.length === 0) return;
  await db.productListingRow.createMany({ data });
}

export async function syncProductListingReadModel(
  productId: string,
  locales?: readonly string[],
): Promise<void> {
  const normalized = normalizeLocales(locales);
  const [discounts, ancestry] = await Promise.all([
    loadProductDiscountContext(),
    loadCategoryAncestry(),
  ]);
  await replaceListingRowsForProduct(productId, normalized, discounts, ancestry);
  await syncProductPdpReadModel(productId, normalized);
  markProductListingReadModelReady();
  await invalidateProductReadCaches();
}

export async function syncProductListingReadModelBatch(
  productIds: string[],
  locales?: readonly string[],
): Promise<void> {
  const unique = [...new Set(productIds.filter(Boolean))];
  if (unique.length === 0) {
    await invalidateProductReadCaches();
    return;
  }
  const normalized = normalizeLocales(locales);
  const [discounts, ancestry] = await Promise.all([
    loadProductDiscountContext(),
    loadCategoryAncestry(),
  ]);
  for (let index = 0; index < unique.length; index += DEFAULT_LISTING_BATCH_SIZE) {
    const chunk = unique.slice(index, index + DEFAULT_LISTING_BATCH_SIZE);
    for (const productId of chunk) {
      await replaceListingRowsForProduct(productId, normalized, discounts, ancestry);
    }
  }
  await syncProductPdpReadModelBatch(unique, normalized);
  markProductListingReadModelReady();
  await invalidateProductReadCaches();
}

export async function deleteProductListingReadModel(productId: string): Promise<void> {
  await db.productListingRow.deleteMany({ where: { productId } });
  await deleteProductPdpReadModel(productId);
  invalidateProductListingReadModelReadyMemo();
  await invalidateProductReadCaches();
}

export async function syncProductListingReadModelByVariantIds(
  variantIds: string[],
): Promise<void> {
  const unique = [...new Set(variantIds.filter(Boolean))];
  if (unique.length === 0) return;
  const variants = await db.productVariant.findMany({
    where: { id: { in: unique } },
    select: { productId: true },
  });
  await syncProductListingReadModelBatch(variants.map((row) => row.productId));
}

export async function syncProductListingReadModelByBrand(brandId: string): Promise<void> {
  const products = await db.product.findMany({
    where: { brandId },
    select: { id: true },
  });
  await syncProductListingReadModelBatch(products.map((row) => row.id));
}

export async function syncProductListingReadModelByCategoryIds(
  categoryIds: string[],
): Promise<void> {
  if (categoryIds.length === 0) return;
  const products = await db.product.findMany({
    where: {
      OR: [
        { primaryCategoryId: { in: categoryIds } },
        { categoryIds: { hasSome: categoryIds } },
      ],
    },
    select: { id: true },
  });
  await syncProductListingReadModelBatch(products.map((row) => row.id));
}

export async function rebuildProductListingReadModel(
  locales?: readonly string[],
): Promise<void> {
  const normalized = normalizeLocales(locales);
  const [discounts, ancestry] = await Promise.all([
    loadProductDiscountContext(),
    loadCategoryAncestry(),
  ]);
  await db.productListingRow.deleteMany();
  const products = await db.product.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  for (let index = 0; index < products.length; index += DEFAULT_LISTING_BATCH_SIZE) {
    const chunk = products.slice(index, index + DEFAULT_LISTING_BATCH_SIZE);
    await insertListingRowsForProductIds(
      chunk.map((product) => product.id),
      normalized,
      discounts,
      ancestry,
    );
  }
  await rebuildProductPdpReadModel(normalized);
  markProductListingReadModelReady();
  await invalidateProductReadCaches();
}
