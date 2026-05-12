import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '../lib/layout-breakpoints.constants';

/**
 * Home “best choice” / special-offers: horizontal 2-row strip uses container query units (`cqi`)
 * so each column width is a fraction of the scrollport. Horizontal gap sums (between N columns, N−1 gaps):
 * compact `gap-4` (1rem), tablet `gap-5` (2×1.25rem), desktop `gap-6` (3×1.5rem or 2×1.5rem for three-up).
 */
export const HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_COMPACT_REM = 1;
export const HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_TABLET_REM = 2.5;
export const HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_DESKTOP_FOUR_COL_REM = 4.5;
export const HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_DESKTOP_THREE_COL_REM = 3;

/** Narrow viewports: two card columns visible (four cards in two rows). */
export const HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_COMPACT_CLASS = `w-[calc((100cqi-${HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_COMPACT_REM}rem)/2)]`;

/** Tablet band (`744px`–below `lg`): three columns across the scrollport. */
export const HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_TABLET_CLASS = `min-[744px]:max-lg:w-[calc((100cqi-${HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_TABLET_REM}rem)/3)]`;

/** Desktop shell (`lg+`): four columns. */
export const HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_DESKTOP_CLASS = `lg:w-[calc((100cqi-${HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_DESKTOP_FOUR_COL_REM}rem)/4)]`;

/** Large iPad home shell: three columns. */
export const HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_IPAD_PRO_CLASS = `lg:w-[calc((100cqi-${HOME_BEST_CHOICE_TWO_ROW_TOTAL_GAP_X_DESKTOP_THREE_COL_REM}rem)/3)]`;

/**
 * Column stack: two product cards, snap target for horizontal scroll.
 * Gaps: `gap-4` / `gap-5` (tablet) / `gap-6` (`lg+`) between rows.
 */
export const HOME_BEST_CHOICE_TWO_ROW_COLUMN_SHELL_CLASS =
  'flex min-w-0 shrink-0 snap-start flex-col gap-4 min-[744px]:max-lg:gap-5 lg:gap-6';

/** Single-card column (special offers one-row strip); same horizontal track widths as two-row. */
export const HOME_BEST_CHOICE_ONE_ROW_COLUMN_SHELL_CLASS =
  'flex min-w-0 shrink-0 snap-start flex-col';

/**
 * Home “best choice” / special-offers: {@link HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_COMPACT_CLASS} shows
 * four cards (two columns × two rows); this value drives {@link ProductCard} density and carousel dot estimates.
 */
export const HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_COMPACT = 4;

/**
 * Mid-width band before `lg`: strip shows six cards (three columns × two rows); used for card density + dot estimates.
 */
export const HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET = 6;

/**
 * ~iPad mini portrait (`744px` CSS); with `lg` the strip switches to four-up desktop columns (see two-row constants).
 * (Tailwind `md` is `768px`; mini is slightly narrower.)
 */
export const HOME_BEST_CHOICE_MOBILE_TABLET_MIN_WIDTH_PX = 744;

/** Matches Tailwind `lg` (desktop shell column count on the 2-row strip). */
export const HOME_BEST_CHOICE_MOBILE_DESKTOP_MIN_WIDTH_PX = LAYOUT_DESKTOP_MIN_WIDTH_PX;

/** `matchMedia` string: widths that use tablet column count and `grid-3` cards on the 2-row strip. */
export const HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA = `(min-width: ${HOME_BEST_CHOICE_MOBILE_TABLET_MIN_WIDTH_PX}px) and (max-width: ${
  HOME_BEST_CHOICE_MOBILE_DESKTOP_MIN_WIDTH_PX - 1
}px)`;

/**
 * Column/gap track for cart line items and legacy grids; home best-choice uses {@link HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_DESKTOP_CLASS}.
 */
export const HOME_BEST_CHOICE_DESKTOP_GRID_TRACK =
  'grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6 lg:gap-6';

/** Retained for cart/wishlist grids (not used by the home 2-row product strip). */
export const HOME_BEST_CHOICE_DESKTOP_GRID_COLS_DEFAULT = 'lg:grid-cols-4';
/** Retained for cart/wishlist grids (not used by the home 2-row product strip). */
export const HOME_BEST_CHOICE_DESKTOP_GRID_COLS_IPAD_PRO = 'lg:grid-cols-3';

/**
 * Cart page: same track as home desktop rows; three `lg` columns for wider cards
 * (home uses four columns on standard desktop — cart keeps three).
 */
export const CART_LINE_ITEMS_GRID_CLASS =
  'grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-3 lg:gap-6';

/** Wishlist desktop: five columns so each card is a bit narrower than home’s four-up row. */
export const HOME_BEST_CHOICE_DESKTOP_GRID_COLS_WISHLIST = 'lg:grid-cols-5';

/**
 * Wishlist page: same track/gaps as home; `lg` uses five columns for slightly narrower cards.
 */
export const WISHLIST_LINE_ITEMS_GRID_CLASS = `grid ${HOME_BEST_CHOICE_DESKTOP_GRID_TRACK} ${HOME_BEST_CHOICE_DESKTOP_GRID_COLS_WISHLIST}`;

/**
 * Desktop (`lg`): space between the home heading row (e.g. “best choice”, special offers) and the product grid under it.
 */
export const HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS = 'lg:mt-[42px]' as const;
