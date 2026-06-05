import { processImageUrl } from './utils/image-utils';

type CategoryMediaItem =
  | string
  | null
  | undefined
  | { url?: string; src?: string; value?: string };

export function extractCategoryImageUrl(media: unknown): string | null {
  if (!Array.isArray(media)) {
    return null;
  }

  for (const item of media) {
    const url = processImageUrl(item as CategoryMediaItem);
    if (url) {
      return url;
    }
  }

  return null;
}

export function buildCategoryMediaFromImageUrl(imageUrl: string | null): { url: string }[] {
  if (!imageUrl?.trim()) {
    return [];
  }

  const normalized = processImageUrl(imageUrl.trim());
  if (!normalized) {
    return [];
  }

  return [{ url: normalized }];
}
