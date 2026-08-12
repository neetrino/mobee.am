/**
 * Detect product images that came from Marco (R2 marco paths or marco.am CDN).
 * Official manufacturer media under `products/official/` is not Marco.
 */

const MARCO_IMAGE_PATH_RE =
  /\/products\/(?:imported\/)?marco\//i;

const MARCO_HOST_RE = /(^|\.)marco\.am$/i;

/**
 * True when the URL is hosted as Marco import media.
 */
export function isMarcoHostedProductImageUrl(
  url: string | null | undefined,
): boolean {
  if (typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (MARCO_IMAGE_PATH_RE.test(trimmed)) {
    return true;
  }

  try {
    const host = new URL(trimmed).hostname;
    return MARCO_HOST_RE.test(host);
  } catch {
    return false;
  }
}

type MediaLike = unknown;
type VariantLike = {
  imageUrl?: string | null;
  media?: MediaLike;
};

function firstMediaUrl(media: MediaLike): string | null {
  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }
  const first = media[0];
  if (typeof first === "string" && first.trim()) {
    return first.trim();
  }
  if (first && typeof first === "object") {
    const record = first as { url?: unknown; src?: unknown; value?: unknown };
    for (const key of ["url", "src", "value"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

/**
 * True when the product's primary listing image is Marco-sourced.
 */
export function productHasMarcoListingImage(product: {
  media?: MediaLike;
  variants?: VariantLike[] | null;
}): boolean {
  const fromProduct = firstMediaUrl(product.media);
  if (isMarcoHostedProductImageUrl(fromProduct)) {
    return true;
  }

  for (const variant of product.variants ?? []) {
    if (isMarcoHostedProductImageUrl(variant.imageUrl)) {
      return true;
    }
    if (isMarcoHostedProductImageUrl(firstMediaUrl(variant.media))) {
      return true;
    }
  }

  return false;
}
