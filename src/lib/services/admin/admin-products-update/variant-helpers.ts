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
