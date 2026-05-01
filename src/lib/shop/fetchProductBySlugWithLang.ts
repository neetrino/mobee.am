import { apiClient } from "../api-client";
import { getStoredLanguage } from "../language";

/**
 * Fetches `/api/v1/products/:slug` using the storefront language, with `en` fallback
 * when the slug exists only under another locale (same pattern as `useProductFetch`).
 */
export async function fetchProductBySlugWithLang<T>(encodedSlug: string): Promise<T> {
  const currentLang = getStoredLanguage();
  try {
    return await apiClient.get<T>(`/api/v1/products/${encodedSlug}`, {
      params: { lang: currentLang },
    });
  } catch (error: unknown) {
    const errorStatus =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : undefined;
    if (errorStatus === 404 && currentLang !== "en") {
      return await apiClient.get<T>(`/api/v1/products/${encodedSlug}`, {
        params: { lang: "en" },
      });
    }
    throw error;
  }
}
