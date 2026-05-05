const SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX = 403;
const SHOP_FILTER_SIDEBAR_WIDTH_SCALE = 0.9;

/**
 * Desktop `/shop` filter aside width (10% under Figma base column).
 * Use with `width` / `max-width` via a CSS variable on the element.
 */
export const SHOP_FILTER_SIDEBAR_WIDTH_CSS = `calc(${SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX}px * ${SHOP_FILTER_SIDEBAR_WIDTH_SCALE})`;
