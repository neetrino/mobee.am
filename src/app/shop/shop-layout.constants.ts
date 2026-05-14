const SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX = 403;
const SHOP_FILTER_SIDEBAR_WIDTH_SCALE = 0.9;
const SHOP_FILTER_SIDEBAR_TOP_OFFSET_REM = 4.25;

/**
 * Desktop `/shop` filter aside width (10% under Figma base column).
 * Use with `width` / `max-width` via a CSS variable on the element.
 */
export const SHOP_FILTER_SIDEBAR_WIDTH_CSS = `calc(${SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX}px * ${SHOP_FILTER_SIDEBAR_WIDTH_SCALE})`;

/** Desktop `/shop` sticky filter offset, shared by `top` and scroll height. */
export const SHOP_FILTER_SIDEBAR_TOP_OFFSET_CSS = `${SHOP_FILTER_SIDEBAR_TOP_OFFSET_REM}rem`;

/** Desktop `/shop` filter scrolls within the viewport while keeping scrollbar chrome hidden. */
export const SHOP_FILTER_SIDEBAR_SCROLL_CLASS =
  'lg:max-h-[calc(100dvh-var(--shop-filter-sidebar-top-offset))] lg:overflow-y-auto lg:overscroll-contain lg:scrollbar-hide';

/** Space between `/shop` content (filters + catalog) and the site footer; all breakpoints. */
export const SHOP_PAGE_FOOTER_GAP_CLASS = 'pb-12';

/** Vertical gap between filter sections (each ends with `border-b`). Desktop sidebar + mobile drawer. */
export const SHOP_FILTER_SECTIONS_STACK_CLASS = 'flex flex-col gap-6';
