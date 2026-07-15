import type {
  AdminProductUpdateInput,
  LegacyProductUpdateInput,
  PartialProductUpdateInput,
} from "@/lib/schemas/admin-product-update.schema";
import { isPartialProductUpdatePayload } from "@/lib/schemas/admin-product-update.schema";
import type { NormalizedProductUpdate } from "./types";

function hasDefinedValue(record: Record<string, unknown> | undefined): boolean {
  if (!record) {
    return false;
  }
  return Object.values(record).some((value) => value !== undefined);
}

/**
 * Returns true when normalized ops require DB writes.
 */
export function hasProductUpdateWork(ops: NormalizedProductUpdate): boolean {
  if (hasDefinedValue(ops.basic as Record<string, unknown> | undefined)) {
    return true;
  }
  if (hasDefinedValue(ops.product as Record<string, unknown> | undefined)) {
    return true;
  }

  if (ops.labels) {
    const { add, update, removeIds, replace } = ops.labels;
    if (replace !== undefined || (add?.length ?? 0) > 0 || (update?.length ?? 0) > 0 || (removeIds?.length ?? 0) > 0) {
      return true;
    }
  }

  if (ops.attributes) {
    const { addIds, removeIds, replaceIds } = ops.attributes;
    if (
      replaceIds !== undefined ||
      (addIds?.length ?? 0) > 0 ||
      (removeIds?.length ?? 0) > 0
    ) {
      return true;
    }
  }

  if (ops.variants) {
    const { create, update, deleteIds, legacyReplace } = ops.variants;
    if (
      legacyReplace !== undefined ||
      (create?.length ?? 0) > 0 ||
      (update?.length ?? 0) > 0 ||
      (deleteIds?.length ?? 0) > 0
    ) {
      return true;
    }
  }

  if (ops.media?.replace !== undefined) {
    return true;
  }

  return false;
}

/**
 * Whether AttributeValue imageUrl sync should run after commit.
 */
export function needsAttributeValueImageSync(ops: NormalizedProductUpdate): boolean {
  const variants = ops.variants;
  if (!variants) {
    return false;
  }

  if ((variants.create?.length ?? 0) > 0) {
    return true;
  }
  if ((variants.deleteIds?.length ?? 0) > 0) {
    return true;
  }
  if (variants.legacyReplace !== undefined) {
    return true;
  }
  if (
    variants.update?.some(
      (variant) => variant.imageUrl !== undefined || variant.options !== undefined
    )
  ) {
    return true;
  }

  return false;
}

function normalizePartial(data: PartialProductUpdateInput): NormalizedProductUpdate {
  const ops: NormalizedProductUpdate = {};

  if (data.locale !== undefined) {
    ops.locale = data.locale;
  }
  if (data.basic !== undefined) {
    ops.basic = data.basic;
  }
  if (data.product !== undefined) {
    ops.product = data.product;
  }
  if (data.labels !== undefined) {
    ops.labels = data.labels;
  }
  if (data.attributes !== undefined) {
    ops.attributes = data.attributes;
  }
  if (data.variants !== undefined) {
    ops.variants = data.variants;
  }
  if (data.media !== undefined) {
    ops.media = data.media;
  }

  return ops;
}

function normalizeLegacy(data: LegacyProductUpdateInput): NormalizedProductUpdate {
  const ops: NormalizedProductUpdate = {};

  if (data.locale !== undefined) {
    ops.locale = data.locale;
  }

  const hasBasic =
    data.title !== undefined ||
    data.slug !== undefined ||
    data.subtitle !== undefined ||
    data.descriptionHtml !== undefined;

  if (hasBasic) {
    ops.basic = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      ...(data.descriptionHtml !== undefined && { descriptionHtml: data.descriptionHtml }),
    };
  }

  const hasProduct =
    data.brandId !== undefined ||
    data.primaryCategoryId !== undefined ||
    data.categoryIds !== undefined ||
    data.published !== undefined ||
    data.featured !== undefined;

  if (hasProduct) {
    ops.product = {
      ...(data.brandId !== undefined && { brandId: data.brandId }),
      ...(data.primaryCategoryId !== undefined && { primaryCategoryId: data.primaryCategoryId }),
      ...(data.categoryIds !== undefined && { categoryIds: data.categoryIds }),
      ...(data.published !== undefined && { published: data.published }),
      ...(data.featured !== undefined && { featured: data.featured }),
    };
  }

  if (data.labels !== undefined) {
    ops.labels = { replace: data.labels };
  }

  if (data.attributeIds !== undefined) {
    ops.attributes = { replaceIds: data.attributeIds };
  }

  if (data.media !== undefined) {
    ops.media = { replace: data.media };
  }

  if (data.variants !== undefined) {
    ops.variants = { legacyReplace: data.variants };
  }

  return ops;
}

/**
 * Converts validated partial or legacy payload into a single ops shape.
 */
export function normalizeProductUpdate(
  data: AdminProductUpdateInput
): NormalizedProductUpdate {
  if (isPartialProductUpdatePayload(data)) {
    return normalizePartial(data as PartialProductUpdateInput);
  }
  return normalizeLegacy(data as LegacyProductUpdateInput);
}
