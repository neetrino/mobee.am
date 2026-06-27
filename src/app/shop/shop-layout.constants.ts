const SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX = 403;
const SHOP_FILTER_SIDEBAR_WIDTH_SCALE = 0.9;

/**
 * Desktop `/shop` filter aside width (10% under Figma base column).
 * Use with `width` / `max-width` via a CSS variable on the element.
 */
export const SHOP_FILTER_SIDEBAR_WIDTH_CSS = `calc(${SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX}px * ${SHOP_FILTER_SIDEBAR_WIDTH_SCALE})`;

/** Bottom padding under `/shop` main column — desktop only; mobile relies on `MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS` (no extra stack under pagination). */
export const SHOP_PAGE_FOOTER_GAP_CLASS = 'lg:pb-12' as const;

/** Vertical gap between filter sections (each ends with `border-b`). Desktop sidebar + mobile drawer. */
export const SHOP_FILTER_SECTIONS_STACK_CLASS = 'flex flex-col gap-6';
