import type { CatalogOptionLike } from "./variant-option-where";

export type CatalogLightVariant = {
  price: number;
  priceOnRequest?: boolean | null;
  imageUrl?: string | null;
  media?: unknown;
  options?: CatalogOptionLike[];
  /** Legacy/admin JSONB attribute map — used as facet fallback when options lack a key. */
  attributes?: unknown;
};

export type CatalogLightRow = {
  id: string;
  createdAt: Date;
  featured?: boolean | null;
  media?: unknown;
  discountPercent?: number | null;
  primaryCategoryId?: string | null;
  brandId?: string | null;
  translations?: Array<{ locale: string; title: string }>;
  brand?: {
    id: string;
    slug?: string | null;
    name?: string | null;
    translations?: Array<{ locale: string; name?: string | null }>;
  } | null;
  variants: CatalogLightVariant[];
};

export type CatalogPageSelection = {
  ids: string[];
  total: number;
};
