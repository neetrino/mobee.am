import { processImageUrl } from "./image-utils";

/**
 * Extract first image URL from product media (JSON array).
 * Used by cart, orders, and product display to avoid duplicating logic.
 */
export type MediaItem = string | { url?: string; src?: string; value?: string } | unknown;

function firstMediaRawString(first: unknown): string | null {
  if (typeof first === "string") {
    const t = first.trim();
    return t.length > 0 ? t : null;
  }
  if (!first || typeof first !== "object") {
    return null;
  }
  const o = first as Record<string, unknown>;
  for (const key of ["url", "src", "value"] as const) {
    const v = o[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) {
        return t;
      }
    }
  }
  return null;
}

export function extractMediaUrl(media: unknown): string | null {
  if (!media || !Array.isArray(media) || media.length === 0) {
    return null;
  }
  const raw = firstMediaRawString(media[0]);
  return raw ? processImageUrl(raw) : null;
}
