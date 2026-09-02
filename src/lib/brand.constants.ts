/** Brand name shown in browser tab titles, OG/Twitter metadata, and any user-facing site name slot. Single source of truth. */
export const SITE_BRAND_NAME = 'Mobee';

/** Headline shown in social link previews (Open Graph / Twitter card). Armenian — primary site language. */
export const SITE_SHARE_TITLE = 'Mobee.am — Ժամանակակից էլեկտրոնիկայի հարթակ';

/** Description shown in social link previews and as the default `<meta name="description">`. */
export const SITE_SHARE_DESCRIPTION =
  'Սմարթֆոններ, նոթբուքներ, գաջեթներ և աքսեսուարներ՝ հարմար ու վստահելի գնումների փորձով։';

/** Mobee accent — matches `admin.500` / primary buttons (`#2DB2FF`). */
export const SITE_BRAND_ACCENT_RGB = [45, 178, 255] as const;

/** Wide MOBEE wordmark PNG (cyan, transparent) — header, auth, admin chrome, 404. Not used in the storefront footer. */
export const SITE_WORDMARK_PATH = '/images/brand/mobee-wordmark.png?v=3';

/** Intrinsic pixel size of `mobee-wordmark.png` under `public/`. */
export const SITE_WORDMARK_WIDTH_PX = 1023;

export const SITE_WORDMARK_HEIGHT_PX = 102;

/**
 * Square mark for favicon / Apple touch icon only — tab icons need a compact asset, not the wide wordmark.
 */
export const SITE_APP_ICON_PATH = '/images/brand/mobee-logo.png';

/** Intrinsic pixel size of `mobee-logo.png` under `public/`. */
export const SITE_APP_ICON_WIDTH_PX = 1024;

export const SITE_APP_ICON_HEIGHT_PX = 1024;

/**
 * Default Open Graph / Twitter / messenger link-preview image (landscape 1200×630).
 * Cache-bust query when the asset changes (crawlers cache aggressively).
 */
export const SITE_SHARE_IMAGE_PATH = '/images/brand/mobee-og.png?v=3';

/** Intrinsic pixel size of `mobee-og.png` under `public/` (query string ignored by the file). */
export const SITE_SHARE_IMAGE_WIDTH_PX = 1200;

export const SITE_SHARE_IMAGE_HEIGHT_PX = 630;
