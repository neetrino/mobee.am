export const PRODUCTS_VIEW_MODE_STORAGE_KEY = 'products-view-mode';

export const PRODUCTS_VIEW_MODE_CHANGED_EVENT = 'view-mode-changed';

export type ProductListingViewMode = 'list' | 'grid-2' | 'grid-3';

const VALID_MODES: readonly ProductListingViewMode[] = ['list', 'grid-2', 'grid-3'];

const DEFAULT_LISTING_MODE: ProductListingViewMode = 'grid-2';

/**
 * Parses stored listing mode from localStorage (or null when unset).
 */
export function parseProductListingViewMode(stored: string | null): ProductListingViewMode {
  if (stored && (VALID_MODES as readonly string[]).includes(stored)) {
    return stored as ProductListingViewMode;
  }
  return DEFAULT_LISTING_MODE;
}

/**
 * Persists listing mode and dispatches a window event so the product grid updates.
 */
export function persistProductListingViewMode(mode: ProductListingViewMode): void {
  window.localStorage.setItem(PRODUCTS_VIEW_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent<ProductListingViewMode>(PRODUCTS_VIEW_MODE_CHANGED_EVENT, { detail: mode }),
  );
}
