const SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX = 403;
const SHOP_FILTER_SIDEBAR_WIDTH_SCALE = 0.9;
const SHOP_FILTER_SIDEBAR_TOP_OFFSET_REM = 4.25;
const SHOP_FILTER_SIDEBAR_BOTTOM_OFFSET_REM = 1;

/**
 * Desktop `/shop` filter aside width (10% under Figma base column).
 * Use with `width` / `max-width` via a CSS variable on the element.
 */
export const SHOP_FILTER_SIDEBAR_WIDTH_CSS = `calc(${SHOP_FILTER_SIDEBAR_BASE_WIDTH_PX}px * ${SHOP_FILTER_SIDEBAR_WIDTH_SCALE})`;

/** Desktop `/shop` sticky filter offset, shared by `top` and scroll height. */
export const SHOP_FILTER_SIDEBAR_TOP_OFFSET_CSS = `${SHOP_FILTER_SIDEBAR_TOP_OFFSET_REM}rem`;

/** Breathing room under the filter list inside the scroll viewport. */
export const SHOP_FILTER_SIDEBAR_BOTTOM_OFFSET_CSS = `${SHOP_FILTER_SIDEBAR_BOTTOM_OFFSET_REM}rem`;

/** Desktop `/shop` filter scrolls within the viewport while keeping scrollbar chrome hidden. */
export const SHOP_FILTER_SIDEBAR_SCROLL_CLASS =
  'lg:flex lg:min-h-0 lg:max-h-[calc(100dvh-var(--shop-filter-sidebar-top-offset)-var(--shop-filter-sidebar-bottom-offset))] lg:flex-col lg:overflow-hidden';

/** Scrollable filter list region inside the desktop aside. */
export const SHOP_FILTER_SIDEBAR_BODY_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] scrollbar-hide px-6 pb-8';

/** Bottom padding under `/shop` main column — desktop only; mobile relies on `MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS` (no extra stack under pagination). */
export const SHOP_PAGE_FOOTER_GAP_CLASS = 'lg:pb-12' as const;

/** Vertical gap between filter sections (each ends with `border-b`). Desktop sidebar + mobile drawer. */
export const SHOP_FILTER_SECTIONS_STACK_CLASS = 'flex flex-col gap-6';
