/**
 * Format product for list response
 */
export function formatProductForList(product: {
  id: string;
  published: boolean;
  featured: boolean | null;
  discountPercent: number | null;
  createdAt: Date;
  translations?: Array<{
    slug: string;
    title: string;
  }>;
  variants?: Array<{
    price: number;
    stock: number;
    compareAtPrice: number | null;
  }>;
  media?: unknown[];
}) {
  // Безопасное получение translation с проверкой на существование массива
  const translation = Array.isArray(product.translations) && product.translations.length > 0
    ? product.translations[0]
    : null;
  
  // Безопасное получение variant с проверкой на существование массива
  const variant = Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants[0]
    : null;
  
  const image = extractImageFromMedia(product.media);

  return {
    id: product.id,
    slug: translation?.slug || "",
    title: translation?.title || "",
    published: product.published,
    featured: product.featured || false,
    price: variant?.price || 0,
    stock: variant?.stock || 0,
    discountPercent: product.discountPercent || 0,
    compareAtPrice: variant?.compareAtPrice || null,
    colorStocks: [], // Can be enhanced later
    image,
    createdAt: product.createdAt.toISOString(),
  };
}

/**
 * Extract image from media array
 */
function extractImageFromMedia(media: unknown[] | undefined): string | null {
  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }

  const firstMedia = media[0];
  
  if (typeof firstMedia === "string") {
    return firstMedia;
  }
  
  if (firstMedia && typeof firstMedia === "object" && "url" in firstMedia) {
    const mediaObj = firstMedia as { url?: string };
    return mediaObj.url || null;
  }

  return null;
}




