import { z } from "zod";

const numberLike = z.union([z.number(), z.string()]);

const labelInputSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  value: z.string().min(1),
  position: z.string().min(1),
  color: z.string().nullable().optional(),
});

const variantOptionSchema = z.object({
  attributeKey: z.string().min(1),
  value: z.string().min(1),
  valueId: z.string().optional(),
});

const createVariantSchema = z.object({
  sku: z.string().optional(),
  price: numberLike,
  compareAtPrice: numberLike.nullable().optional(),
  stock: numberLike,
  published: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  options: z.array(variantOptionSchema).optional(),
  color: z.string().optional(),
  size: z.string().optional(),
});

const updateVariantSchema = z.object({
  id: z.string().min(1),
  sku: z.string().optional(),
  price: numberLike.optional(),
  compareAtPrice: numberLike.nullable().optional(),
  stock: numberLike.optional(),
  published: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  options: z.array(variantOptionSchema).optional(),
});

const mediaItemSchema = z.union([
  z.string(),
  z.object({
    url: z.string().optional(),
    src: z.string().optional(),
    value: z.string().optional(),
  }),
]);

const partialProductUpdateSchema = z.object({
  basic: z
    .object({
      title: z.string().optional(),
      slug: z.string().optional(),
      descriptionHtml: z.string().nullable().optional(),
      subtitle: z.string().nullable().optional(),
    })
    .optional(),
  product: z
    .object({
      brandId: z.string().nullable().optional(),
      primaryCategoryId: z.string().nullable().optional(),
      categoryIds: z.array(z.string()).optional(),
      published: z.boolean().optional(),
      featured: z.boolean().optional(),
    })
    .optional(),
  labels: z
    .object({
      add: z.array(labelInputSchema).optional(),
      update: z.array(labelInputSchema).optional(),
      removeIds: z.array(z.string()).optional(),
      replace: z.array(labelInputSchema).optional(),
    })
    .optional(),
  attributes: z
    .object({
      addIds: z.array(z.string()).optional(),
      removeIds: z.array(z.string()).optional(),
      replaceIds: z.array(z.string()).optional(),
    })
    .optional(),
  variants: z
    .object({
      create: z.array(createVariantSchema).optional(),
      update: z.array(updateVariantSchema).optional(),
      deleteIds: z.array(z.string()).optional(),
    })
    .optional(),
  media: z
    .object({
      replace: z.array(mediaItemSchema).optional(),
    })
    .optional(),
  locale: z.string().optional(),
});

const legacyVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  price: numberLike,
  compareAtPrice: numberLike.nullable().optional(),
  stock: numberLike,
  published: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  options: z.array(variantOptionSchema).optional(),
  color: z.string().optional(),
  size: z.string().optional(),
});

const legacyProductUpdateSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  descriptionHtml: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  primaryCategoryId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  locale: z.string().optional(),
  media: z.array(mediaItemSchema).optional(),
  labels: z.array(labelInputSchema).optional(),
  attributeIds: z.array(z.string()).optional(),
  variants: z.array(legacyVariantSchema).optional(),
  mainProductImage: z.unknown().optional(),
});

export type PartialProductUpdateInput = z.infer<typeof partialProductUpdateSchema>;
export type LegacyProductUpdateInput = z.infer<typeof legacyProductUpdateSchema>;
export type AdminProductUpdateInput = PartialProductUpdateInput | LegacyProductUpdateInput;

/**
 * Detects the new partial payload shape vs legacy flat payload.
 */
export function isPartialProductUpdatePayload(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }

  const record = body as Record<string, unknown>;

  if ("basic" in record || "product" in record || "attributes" in record) {
    return true;
  }

  if (record.labels && typeof record.labels === "object" && !Array.isArray(record.labels)) {
    return true;
  }

  if (
    record.media &&
    typeof record.media === "object" &&
    !Array.isArray(record.media) &&
    "replace" in (record.media as Record<string, unknown>)
  ) {
    return true;
  }

  if (
    record.variants &&
    typeof record.variants === "object" &&
    !Array.isArray(record.variants)
  ) {
    return true;
  }

  return false;
}

export function safeParseAdminProductUpdate(
  body: unknown
):
  | { success: true; data: AdminProductUpdateInput; format: "partial" | "legacy" }
  | { success: false; error: z.ZodError } {
  if (isPartialProductUpdatePayload(body)) {
    const parsed = partialProductUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }
    return { success: true, data: parsed.data, format: "partial" };
  }

  const parsed = legacyProductUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  return { success: true, data: parsed.data, format: "legacy" };
}

export {
  partialProductUpdateSchema,
  legacyProductUpdateSchema,
  labelInputSchema,
  createVariantSchema,
  updateVariantSchema,
};
