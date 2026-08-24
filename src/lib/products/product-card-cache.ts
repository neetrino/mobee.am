export type ProductCardCachePayload = {
  slug: string;
  id: string;
  title: string;
  price: number | null;
  hasPrice?: boolean;
  currency?: string;
  image: string | null;
  brand?: { id: string; name: string } | null;
  defaultVariantId?: string | null;
  inStock?: boolean;
  published?: boolean;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  warrantyYears?: import('../constants/product-warranty').ProductWarrantyYears | null;
};

type ProductCardCacheEntry = {
  value: ProductCardCachePayload;
  expiresAt: number;
};

const MEMORY_CACHE = new Map<string, ProductCardCacheEntry>();
const SESSION_KEY_PREFIX = 'mobee.productCard:';
const DEFAULT_TTL_MS = 3 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readFromSession(slug: string): ProductCardCachePayload | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${slug}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ProductCardCacheEntry;
    if (!parsed?.value || Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${slug}`);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeToSession(slug: string, value: ProductCardCachePayload, ttlMs: number): void {
  if (!isBrowser()) {
    return;
  }

  const entry: ProductCardCacheEntry = { value, expiresAt: Date.now() + ttlMs };
  try {
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${slug}`, JSON.stringify(entry));
  } catch {
    // optional
  }
}

export function writeProductCardCache(
  payload: ProductCardCachePayload,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const slug = payload.slug?.trim();
  if (!slug) {
    return;
  }

  MEMORY_CACHE.set(slug, { value: payload, expiresAt: Date.now() + ttlMs });
  writeToSession(slug, payload, ttlMs);
}

export function readProductCardCache(slug: string): ProductCardCachePayload | null {
  const normalized = slug?.trim();
  if (!normalized) {
    return null;
  }

  const memory = MEMORY_CACHE.get(normalized);
  if (memory) {
    if (Date.now() < memory.expiresAt) {
      return memory.value;
    }
    MEMORY_CACHE.delete(normalized);
  }

  const sessionValue = readFromSession(normalized);
  if (sessionValue) {
    MEMORY_CACHE.set(normalized, {
      value: sessionValue,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });
  }
  return sessionValue;
}

export function buildProductCardCachePayload(product: {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  hasPrice?: boolean;
  image: string | null;
  inStock?: boolean;
  brand?: { id: string; name: string } | null;
  defaultVariantId?: string | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  warrantyYears?: import('../constants/product-warranty').ProductWarrantyYears | null;
  published?: boolean;
}): ProductCardCachePayload {
  return {
    slug: product.slug,
    id: product.id,
    title: product.title,
    price: product.price,
    hasPrice: product.hasPrice ?? (product.price != null && product.price > 0),
    image: product.image,
    brand: product.brand ?? null,
    defaultVariantId: product.defaultVariantId ?? null,
    inStock: product.inStock,
    published: product.published,
    compareAtPrice: product.compareAtPrice ?? null,
    discountPercent: product.discountPercent ?? null,
    warrantyYears: product.warrantyYears ?? null,
  };
}

export function touchProductCardCacheFromListing(product: {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  hasPrice?: boolean;
  image: string | null;
  inStock?: boolean;
  brand?: { id: string; name: string } | null;
  defaultVariantId?: string | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  warrantyYears?: import('../constants/product-warranty').ProductWarrantyYears | null;
}): void {
  writeProductCardCache(buildProductCardCachePayload(product));
}

export const PRODUCT_CARD_CACHE_TTL_MS = DEFAULT_TTL_MS;
