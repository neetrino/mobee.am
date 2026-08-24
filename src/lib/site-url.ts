const DEFAULT_PRODUCTION_SITE_URL = 'https://mobee.am';

/**
 * Canonical public site origin (no trailing slash).
 * Used for Open Graph absolute URLs and Next.js metadataBase.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    '';

  if (!raw) {
    return DEFAULT_PRODUCTION_SITE_URL;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/$/, '');
  }

  return `https://${raw.replace(/\/$/, '')}`;
}
