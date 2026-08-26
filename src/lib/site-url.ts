const DEFAULT_PRODUCTION_SITE_URL = 'https://www.mobee.am';

function normalizeSiteOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) {
    return DEFAULT_PRODUCTION_SITE_URL;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Canonical public site origin (no trailing slash).
 * Used for Open Graph absolute URLs and Next.js metadataBase.
 *
 * Never uses ephemeral Vercel preview hostnames — social crawlers cannot fetch images from them.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    '';

  if (configured) {
    return normalizeSiteOrigin(configured);
  }

  if (process.env.NODE_ENV !== 'production') {
    const previewHost = process.env.VERCEL_URL?.trim();
    if (previewHost) {
      return normalizeSiteOrigin(previewHost);
    }
  }

  return DEFAULT_PRODUCTION_SITE_URL;
}

/** Absolute URL for a path under `public/` (or any site-relative path). */
export function getSiteAssetUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
