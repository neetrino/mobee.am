import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '../lib/layout-breakpoints.constants';

/**
 * Home “best choice” / special-offers product rows: cards per horizontal snap page below `lg`.
 * Narrow phones: 2×2 grid per page (four cards).
 */
export const HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_COMPACT = 4;

/**
 * Tablet / iPad mini while still in the mobile carousel: 3×2 grid per page.
 */
export const HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET = 6;

/**
 * ~iPad mini portrait (`744px` CSS); from this width until `lg` the home carousel uses six-card pages.
 * (Tailwind `md` is `768px`; mini is slightly narrower.)
 */
export const HOME_BEST_CHOICE_MOBILE_TABLET_MIN_WIDTH_PX = 744;

/** Matches Tailwind `lg` (desktop grid replaces carousel). */
export const HOME_BEST_CHOICE_MOBILE_DESKTOP_MIN_WIDTH_PX = LAYOUT_DESKTOP_MIN_WIDTH_PX;

/** `matchMedia` string: tablet width while home still uses the mobile carousel (`lg:hidden`). */
export const HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA = `(min-width: ${HOME_BEST_CHOICE_MOBILE_TABLET_MIN_WIDTH_PX}px) and (max-width: ${
  HOME_BEST_CHOICE_MOBILE_DESKTOP_MIN_WIDTH_PX - 1
}px)`;

/**
 * Column/gap track for home best-choice desktop grid and cart line items.
 * Home wraps with `hidden` + `lg:grid` + column variant (see {@link HomeBestChoiceStyleProductGrid}).
 */
export const HOME_BEST_CHOICE_DESKTOP_GRID_TRACK =
  'grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6 lg:gap-6';

export const HOME_BEST_CHOICE_DESKTOP_GRID_COLS_DEFAULT = 'lg:grid-cols-4';
export const HOME_BEST_CHOICE_DESKTOP_GRID_COLS_IPAD_PRO = 'lg:grid-cols-3';

/**
 * Default desktop carousel page shape for the “best choice” featured row:
 * 2 rows × 4 columns = 8 cards visible per page.
 */
export const HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT = 2;
export const HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT = 4;

/**
 * Special-offers desktop carousel page shape: single row of 4 cards per page.
 */
export const HOME_SPECIAL_OFFERS_DESKTOP_PAGE_ROWS = 1;
export const HOME_SPECIAL_OFFERS_DESKTOP_PAGE_COLS = 4;

/**
 * Cart page: same track as home desktop rows; three `lg` columns for wider cards
 * (home uses four columns on standard desktop — cart keeps three).
 */
export const CART_LINE_ITEMS_GRID_CLASS =
  'grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-3 lg:gap-6';

/**
 * Wishlist page: same track/gaps as home; four columns from `lg` through iPad Pro width;
 * five columns from `wishlist-five` breakpoint (see `WISHLIST_GRID_FIVE_COLUMNS_MIN_WIDTH_PX` in layout-breakpoints).
 */
export const HOME_BEST_CHOICE_DESKTOP_GRID_COLS_WISHLIST =
  'lg:grid-cols-4 wishlist-five:grid-cols-5';

/**
 * Wishlist page grid: same track/gaps as home + {@link HOME_BEST_CHOICE_DESKTOP_GRID_COLS_WISHLIST}.
 */
export const WISHLIST_LINE_ITEMS_GRID_CLASS = `grid ${HOME_BEST_CHOICE_DESKTOP_GRID_TRACK} ${HOME_BEST_CHOICE_DESKTOP_GRID_COLS_WISHLIST}`;

/**
 * Desktop (`lg`): space between the home heading row (e.g. “best choice”, special offers) and the product grid under it.
 */
export const HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS = 'lg:mt-[42px]' as const;
