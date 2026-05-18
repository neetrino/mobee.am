import { apiClient } from '../api-client';
import { getStoredLanguage } from '../language';
import { pruneWishlistToCatalogIds, readWishlistProductIds } from './wishlist-storage';

const PRODUCTS_FETCH_LIMIT = '1000';

/**
 * Drops wishlist ids that no longer exist in the product catalog so nav badges match the wishlist page.
 */
export async function reconcileWishlistWithCatalog(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const storedIds = readWishlistProductIds();
  if (storedIds.length === 0) {
    return;
  }

  try {
    const response = await apiClient.get<{ data: Array<{ id: string }> }>('/api/v1/products', {
      params: {
        limit: PRODUCTS_FETCH_LIMIT,
        lang: getStoredLanguage(),
      },
    });

    const catalogIds = new Set(response.data.map((product) => product.id));
    pruneWishlistToCatalogIds(catalogIds);
  } catch {
    // Keep stored ids when the catalog request fails (offline / transient errors).
  }
}
