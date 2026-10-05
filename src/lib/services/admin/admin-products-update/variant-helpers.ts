import { processImageUrl, smartSplitUrls } from "../../../utils/image-utils";

export function processVariantImageUrl(
  imageUrl: string | null | undefined
): string | null | undefined {
  if (imageUrl === undefined) {
    return undefined;
  }
  if (imageUrl === null || imageUrl === "") {
    return null;
  }

  const urls = smartSplitUrls(imageUrl);
  const processedUrls = urls
    .map((url) => processImageUrl(url))
    .filter((url): url is string => url !== null);
  return processedUrls.length > 0 ? processedUrls.join(",") : null;
}

function readMediaAlt(item: unknown): string | undefined {
  if (!item || typeof item !== "object" || !("alt" in item)) {
    return undefined;
  }
  const alt = (item as { alt?: unknown }).alt;
  return typeof alt === "string" && alt.trim() ? alt : undefined;
}

/**
 * Extracts processed image URLs from a variant `media` JSON array.
 */
export function extractVariantMediaUrls(media: unknown): string[] {
  if (!Array.isArray(media)) {
    return [];
  }
  return media
    .map((item) =>
      typeof item === "string" || (item && typeof item === "object")
        ? processImageUrl(item as string | { url?: string })
        : null
    )
    .filter((url): url is string => url !== null);
}

/**
 * Builds variant `media` from the processed comma-separated imageUrl, keeping alt text of existing entries.
 */
export function buildVariantMediaFromImageUrl(
  processedImageUrl: string | null,
  existingMedia: unknown
): Array<{ url: string; alt?: string }> {
  const altByUrl = new Map<string, string>();
  if (Array.isArray(existingMedia)) {
    for (const item of existingMedia) {
      const url = extractVariantMediaUrls([item])[0];
      const alt = readMediaAlt(item);
      if (url && alt) {
        altByUrl.set(url, alt);
      }
    }
  }

  return smartSplitUrls(processedImageUrl).map((url) => {
    const alt = altByUrl.get(url);
    return alt ? { url, alt } : { url };
  });
}

export function ownershipError(variantId: string): never {
  throw {
    status: 403,
    type: "https://api.shop.am/problems/forbidden",
    title: "Variant ownership mismatch",
    detail: `Variant '${variantId}' does not belong to this product`,
  };
}

export function notFoundError(variantId: string): never {
  throw {
    status: 404,
    type: "https://api.shop.am/problems/not-found",
    title: "Variant not found",
    detail: `Variant with id '${variantId}' does not exist`,
  };
}
