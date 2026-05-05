/** Public path to the MOBEE wordmark SVG (transparent background). */
export const SITE_LOGO_PATH = '/images/brand/mobee-logo.svg';

/** Intrinsic SVG dimensions (matches `viewBox` width/height in `public/images/brand/mobee-logo.svg`). */
export const SITE_LOGO_INTRINSIC_WIDTH = 1685;
export const SITE_LOGO_INTRINSIC_HEIGHT = 169;

/**
 * Tailwind classes: cap wordmark width where the header is crowded (icons on both sides).
 * Values follow approximate ~10:1 wordmark aspect ratio and Figma header chrome.
 */
export const SITE_LOGO_CLASS_HEADER_MOBILE = 'max-w-[min(132px,38vw)]';
export const SITE_LOGO_CLASS_HEADER_DESKTOP = 'max-w-[min(200px,26vw)]';
export const SITE_LOGO_CLASS_MOBILE_DRAWER = 'max-w-[140px]';
export const SITE_LOGO_CLASS_AUTH = 'max-w-[260px]';
export const SITE_LOGO_CLASS_NOT_FOUND = 'max-w-[320px]';
export const SITE_LOGO_CLASS_ADMIN = 'max-w-[min(150px,45vw)]';
