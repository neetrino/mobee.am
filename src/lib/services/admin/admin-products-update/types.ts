/**
 * Shared types for admin product partial update operations.
 */

export interface LabelInput {
  id?: string;
  type: string;
  value: string;
  position: string;
  color?: string | null;
}

export interface VariantOptionInput {
  attributeKey: string;
  value: string;
  valueId?: string;
}

export interface CreateVariantInput {
  sku?: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  stock: string | number;
  published?: boolean;
  imageUrl?: string | null;
  options?: VariantOptionInput[];
  color?: string;
  size?: string;
}

export interface UpdateVariantInput {
  id: string;
  sku?: string;
  price?: string | number;
  compareAtPrice?: string | number | null;
  stock?: string | number;
  published?: boolean;
  imageUrl?: string | null;
  options?: VariantOptionInput[];
}

/** Legacy flat variant (id optional; may match by SKU). */
export interface LegacyVariantInput {
  id?: string;
  sku?: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  stock: string | number;
  published?: boolean;
  imageUrl?: string | null;
  options?: VariantOptionInput[];
  color?: string;
  size?: string;
}

export interface LabelsUpdateOps {
  add?: LabelInput[];
  update?: LabelInput[];
  removeIds?: string[];
  replace?: LabelInput[];
}

export interface AttributesUpdateOps {
  addIds?: string[];
  removeIds?: string[];
  replaceIds?: string[];
}

export interface VariantsUpdateOps {
  create?: CreateVariantInput[];
  update?: UpdateVariantInput[];
  deleteIds?: string[];
  /** Legacy full-list replace; resolved against DB inside the transaction. */
  legacyReplace?: LegacyVariantInput[];
}

export interface MediaUpdateOps {
  replace?: Array<string | { url?: string; src?: string; value?: string }>;
}

/**
 * Normalized partial operations — single path after legacy normalize.
 */
export interface NormalizedProductUpdate {
  basic?: {
    title?: string;
    slug?: string;
    descriptionHtml?: string | null;
    subtitle?: string | null;
  };
  product?: {
    brandId?: string | null;
    primaryCategoryId?: string | null;
    categoryIds?: string[];
    published?: boolean;
    featured?: boolean;
  };
  labels?: LabelsUpdateOps;
  attributes?: AttributesUpdateOps;
  variants?: VariantsUpdateOps;
  media?: MediaUpdateOps;
  locale?: string;
}

export interface ProductUpdateResult {
  success: true;
  id: string;
  updatedAt: Date;
  didUpdate: boolean;
  productSlug?: string;
}

/**
 * @deprecated Use NormalizedProductUpdate. Kept for any lingering imports.
 */
export interface UpdateProductData {
  title?: string;
  slug?: string;
  subtitle?: string;
  descriptionHtml?: string;
  brandId?: string;
  primaryCategoryId?: string;
  categoryIds?: string[];
  published?: boolean;
  featured?: boolean;
  locale?: string;
  media?: unknown[];
  labels?: LabelInput[];
  attributeIds?: string[];
  variants?: LegacyVariantInput[];
}
