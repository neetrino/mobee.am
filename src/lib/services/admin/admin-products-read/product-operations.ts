import { logger } from "../../../utils/logger";
import { normalizeProductWarrantyYears } from "@/lib/constants/product-warranty";
import {
  DEFAULT_ADMIN_CONTENT_LOCALE,
  parseAdminContentLocale,
  type AdminContentLocale,
} from "@/lib/admin/admin-content-locale";
import type { ProductFilters } from "./types";
import { buildProductWhereClause, buildProductOrderByClause } from "./query-builder";
import { executeProductListQuery, executeProductDetailQuery } from "./query-executor";
import { formatProductForList } from "./product-formatter";
import { formatVariantForAdmin } from "./variant-formatter";

type ProductTranslationRow = {
  locale: string;
  title?: string;
  slug?: string;
  subtitle?: string | null;
  descriptionHtml?: string | null;
};

function pickTranslation(
  translations: ProductTranslationRow[],
  locale: AdminContentLocale,
): ProductTranslationRow | null {
  return (
    translations.find((row) => row.locale === locale) ||
    translations.find((row) => row.locale === DEFAULT_ADMIN_CONTENT_LOCALE) ||
    translations[0] ||
    null
  );
}

/**
 * Get products for admin
 */
export async function getProducts(filters: ProductFilters) {
  logger.info('getProducts called with filters', { filters });
  const startTime = Date.now();
  const locale = parseAdminContentLocale(filters.locale, DEFAULT_ADMIN_CONTENT_LOCALE);
  
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where = buildProductWhereClause(filters);
  const orderBy = buildProductOrderByClause(filters);

  logger.debug('Executing database queries...', { where: JSON.stringify(where, null, 2) });

  const { products, total } = await executeProductListQuery(where, orderBy, skip, limit, locale);

  const data = products.map(formatProductForList);

  const totalTime = Date.now() - startTime;
  logger.info(`getProducts completed in ${totalTime}ms. Returning ${data.length} products`);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      locale,
    },
  };
}

/**
 * Get product by ID
 */
export async function getProductById(productId: string, localeInput?: string) {
  const locale = parseAdminContentLocale(localeInput, DEFAULT_ADMIN_CONTENT_LOCALE);
  const product = await executeProductDetailQuery(productId);

  if (!product) {
    throw {
      status: 404,
      type: "https://api.shop.am/problems/not-found",
      title: "Product not found",
      detail: `Product with id '${productId}' does not exist`,
    };
  }

  const productWithRelations = product as typeof product & {
    translations?: ProductTranslationRow[];
    labels?: Array<{ id: string; type: string; value: string; position: string; color: string | null }>;
    variants?: Array<unknown>;
  };
  const translations = Array.isArray(productWithRelations.translations) ? productWithRelations.translations : [];
  const translation = pickTranslation(translations, locale);

  const labels = Array.isArray(productWithRelations.labels) ? productWithRelations.labels : [];
  const variants = Array.isArray(productWithRelations.variants) ? productWithRelations.variants : [];
  
  const productAttributes = Array.isArray((product as { productAttributes?: unknown[] }).productAttributes)
    ? (product as unknown as { productAttributes: Array<{ attributeId?: string; attribute?: { id: string } }> }).productAttributes
    : [];
  const attributeIds = productAttributes
    .map((pa) => pa.attributeId || pa.attribute?.id)
    .filter((id): id is string => !!id);
  
  const legacyAttributeIds = Array.isArray((product as { attributeIds?: unknown[] }).attributeIds)
    ? (product as { attributeIds: string[] }).attributeIds
    : [];
  
  const allAttributeIds = Array.from(new Set([...attributeIds, ...legacyAttributeIds]));

  const translationsByLocale = Object.fromEntries(
    translations.map((row) => [
      row.locale,
      {
        title: row.title || "",
        slug: row.slug || "",
        subtitle: row.subtitle || null,
        descriptionHtml: row.descriptionHtml || null,
      },
    ]),
  );

  return {
    id: product.id,
    locale,
    title: translation?.title || "",
    slug: translation?.slug || "",
    subtitle: translation?.subtitle || null,
    descriptionHtml: translation?.descriptionHtml || null,
    translations: translationsByLocale,
    brandId: product.brandId || null,
    primaryCategoryId: product.primaryCategoryId || null,
    categoryIds: product.categoryIds || [],
    attributeIds: allAttributeIds,
    published: product.published,
    featured: product.featured ?? false,
    warrantyYears: normalizeProductWarrantyYears(
      (product as { warrantyYears?: number | null }).warrantyYears,
    ),
    media: Array.isArray(product.media) ? product.media : [],
    labels: labels.map((label: { id: string; type: string; value: string; position: string; color: string | null }) => ({
      id: label.id,
      type: label.type,
      value: label.value,
      position: label.position,
      color: label.color,
    })),
    variants: variants.map((v) => formatVariantForAdmin(v as Parameters<typeof formatVariantForAdmin>[0])),
  };
}
