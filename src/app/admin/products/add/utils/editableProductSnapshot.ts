import type { GeneratedVariant, ProductLabel } from "../types";
import type { ProductWarrantyYears } from "@/lib/constants/product-warranty";

export interface EditableVariantSnapshot {
  databaseVariantId?: string;
  uiId: string;
  selectedValueIds: string[];
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  image: string | null;
  published: boolean;
}

export interface EditableProductSnapshot {
  basic: {
    title: string;
    slug: string;
    descriptionHtml: string;
  };
  product: {
    brandId: string | null;
    primaryCategoryId: string | null;
    categoryIds: string[];
    published: boolean;
    featured: boolean;
    warrantyYears: ProductWarrantyYears | null;
  };
  labels: ProductLabel[];
  attributeIds: string[];
  variants: EditableVariantSnapshot[];
  media: string[];
  productType: "simple" | "variable";
  simple?: {
    databaseVariantId?: string;
    price: string;
    compareAtPrice: string;
    sku: string;
    quantity: string;
  };
}

export interface BuildEditableSnapshotInput {
  formData: {
    title: string;
    slug: string;
    descriptionHtml: string;
    brandIds: string[];
    primaryCategoryId: string;
    categoryIds: string[];
    published: boolean;
    featured: boolean;
    warrantyYears: ProductWarrantyYears | null;
    imageUrls: string[];
    labels: ProductLabel[];
  };
  productType: "simple" | "variable";
  simpleProductData?: {
    price: string;
    compareAtPrice: string;
    sku: string;
    quantity: string;
  };
  simpleProductDatabaseVariantId?: string;
  selectedAttributesForVariants: Set<string>;
  generatedVariants: GeneratedVariant[];
}

function sortIds(ids: string[]): string[] {
  return [...ids].sort();
}

function normalizeLabel(label: ProductLabel): ProductLabel {
  return {
    id: label.id || undefined,
    type: label.type,
    value: label.value.trim(),
    position: label.position,
    color: label.color ?? null,
  };
}

function normalizeVariant(variant: GeneratedVariant): EditableVariantSnapshot {
  return {
    databaseVariantId: variant.databaseVariantId,
    uiId: variant.id,
    selectedValueIds: sortIds(variant.selectedValueIds),
    price: variant.price.trim(),
    compareAtPrice: variant.compareAtPrice.trim(),
    stock: variant.stock.trim(),
    sku: variant.sku.trim(),
    image: variant.image,
    published: true,
  };
}

/**
 * Builds a normalized snapshot of editable product state for dirty comparison.
 */
export function buildEditableProductSnapshot(
  input: BuildEditableSnapshotInput
): EditableProductSnapshot {
  const brandId =
    input.formData.brandIds.length > 0 ? input.formData.brandIds[0] : null;

  return {
    basic: {
      title: input.formData.title.trim(),
      slug: input.formData.slug.trim(),
      descriptionHtml: input.formData.descriptionHtml.trim(),
    },
    product: {
      brandId,
      primaryCategoryId: input.formData.primaryCategoryId || null,
      categoryIds: sortIds(input.formData.categoryIds),
      published: input.formData.published,
      featured: input.formData.featured,
      warrantyYears:
        input.formData.warrantyYears === 1 ||
        input.formData.warrantyYears === 2 ||
        input.formData.warrantyYears === 3
          ? input.formData.warrantyYears
          : null,
    },
    labels: input.formData.labels
      .filter((label) => label.value.trim() !== "")
      .map(normalizeLabel),
    attributeIds: sortIds(Array.from(input.selectedAttributesForVariants)),
    variants: input.generatedVariants.map(normalizeVariant),
    media: [...input.formData.imageUrls],
    productType: input.productType,
    simple:
      input.productType === "simple" && input.simpleProductData
        ? {
            databaseVariantId: input.simpleProductDatabaseVariantId,
            price: input.simpleProductData.price.trim(),
            compareAtPrice: input.simpleProductData.compareAtPrice.trim(),
            sku: input.simpleProductData.sku.trim(),
            quantity: input.simpleProductData.quantity.trim(),
          }
        : undefined,
  };
}
