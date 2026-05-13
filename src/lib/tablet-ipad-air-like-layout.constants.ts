/**
 * When present on `<html>`, enables Tailwind `ipad-air-band:` utilities (large-tablet chrome).
 * Toggled client-side — keep in sync with `tailwind.config.ts` variant.
 */
export const LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS = 'layout-tablet-ipad-air-like';

/**
 * Exclusive upper bound on viewport width for iPad Air–style chrome (`width <` this value).
 * Align with product request: any screen that does not reach 1300px.
 */
export const TABLET_IPAD_AIR_LIKE_MAX_VIEWPORT_WIDTH_EXCLUSIVE_PX = 1300;
