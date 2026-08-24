export function parseProductSlugParam(rawSlug: string): {
  slug: string;
  variantIdFromUrl: string | null;
} {
  const slugParts = rawSlug.includes(':') ? rawSlug.split(':') : [rawSlug];
  return {
    slug: slugParts[0] ?? '',
    variantIdFromUrl: slugParts.length > 1 ? slugParts[1] : null,
  };
}
