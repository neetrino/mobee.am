const INLINE_IMAGE_PREFIX = "data:image/";
const INLINE_IMAGE_IN_URL_LIST = /,\s*data:image\//i;
/** Rich-text fields may legitimately embed inline images. */
const HTML_FIELD_SUFFIX = "Html";

function isInlineImageString(value: string): boolean {
  return (
    value.trimStart().toLowerCase().startsWith(INLINE_IMAGE_PREFIX) ||
    INLINE_IMAGE_IN_URL_LIST.test(value)
  );
}

/**
 * Returns the path of the first base64 image (`data:image/...`) in an image field, or null.
 * Inline images must go through the upload endpoint (R2) instead of being stored in the DB.
 */
export function findInlineImagePath(value: unknown, path = "$"): string | null {
  if (typeof value === "string") {
    return isInlineImageString(value) ? path : null;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const found = findInlineImagePath(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key.endsWith(HTML_FIELD_SUFFIX)) continue;
    const found = findInlineImagePath(item, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

/**
 * RFC 7807 problem body for a rejected inline image (HTTP 400).
 */
export function buildInlineImageProblem(path: string, instance: string) {
  return {
    type: "https://api.shop.am/problems/validation-error",
    title: "Validation Error",
    status: 400,
    detail: `Inline base64 images are not allowed (${path}). Upload images via /api/v1/admin/products/upload-images.`,
    instance,
  };
}
