import type { RelatedProduct } from '@/components/hooks/useRelatedProducts';

type RelatedProductsCacheEntry = {
  value: RelatedProduct[];
  expiresAt: number;
};

const MEMORY_CACHE = new Map<string, RelatedProductsCacheEntry>();
const SESSION_KEY_PREFIX = 'mobee.relatedProducts:';
const DEFAULT_TTL_MS = 3 * 60 * 1000;

const inflightRequests = new Map<string, Promise<RelatedProduct[]>>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function buildRelatedProductsCacheKey(
  slug: string,
  lang: string,
  productId?: string,
): string {
  const idPart = productId?.trim() ? `id=${productId.trim()}` : `slug=${slug.trim()}`;
  return `${idPart}:lang=${(lang || 'en').trim().toLowerCase()}`;
}

function readFromSession(key: string): RelatedProduct[] | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as RelatedProductsCacheEntry;
    if (!parsed?.value || Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${key}`);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeToSession(key: string, value: RelatedProduct[], ttlMs: number): void {
  if (!isBrowser()) {
    return;
  }

  const entry: RelatedProductsCacheEntry = { value, expiresAt: Date.now() + ttlMs };
  try {
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // optional
  }
}

export function readRelatedProductsCache(key: string): RelatedProduct[] | null {
  const memory = MEMORY_CACHE.get(key);
  if (memory) {
    if (Date.now() < memory.expiresAt) {
      return memory.value;
    }
    MEMORY_CACHE.delete(key);
  }

  const sessionValue = readFromSession(key);
  if (sessionValue) {
    MEMORY_CACHE.set(key, {
      value: sessionValue,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });
  }
  return sessionValue;
}

export function writeRelatedProductsCache(
  key: string,
  value: RelatedProduct[],
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  MEMORY_CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
  writeToSession(key, value, ttlMs);
}

export function fetchRelatedProductsDeduped(
  cacheKey: string,
  loader: () => Promise<RelatedProduct[]>,
): Promise<RelatedProduct[]> {
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = loader().finally(() => {
    inflightRequests.delete(cacheKey);
  });
  inflightRequests.set(cacheKey, promise);
  return promise;
}

export const RELATED_PRODUCTS_CACHE_TTL_MS = DEFAULT_TTL_MS;
