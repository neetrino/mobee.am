/** Brand name shown in browser tab titles, OG/Twitter metadata, and any user-facing site name slot. Single source of truth. */
export const SITE_BRAND_NAME = 'Mobee';

/** Headline shown in social link previews (Open Graph / Twitter card). Armenian — primary site language. */
export const SITE_SHARE_TITLE = 'Mobee.am — Ժամանակակից էլեկտրոնիկայի հարթակ';

/** Description shown in social link previews and as the default `<meta name="description">`. */
export const SITE_SHARE_DESCRIPTION =
  'Սմարթֆոններ, նոթբուքներ, գաջեթներ և աքսեսուարներ՝ հարմար ու վստահելի գնումների փորձով։';

/** Wide MOBEE wordmark PNG (cyan on black) — header, auth, admin chrome, 404. Not used in the storefront footer. */
export const SITE_WORDMARK_PATH = '/images/brand/mobee-wordmark.png';

/** Intrinsic pixel size of `mobee-wordmark.png` under `public/`. */
export const SITE_WORDMARK_WIDTH_PX = 1024;

export const SITE_WORDMARK_HEIGHT_PX = 103;

/**
 * Square mark for favicon / Apple touch icon only — tab icons need a compact asset, not the wide wordmark.
 */
export const SITE_APP_ICON_PATH = '/images/brand/mobee-logo.png';
