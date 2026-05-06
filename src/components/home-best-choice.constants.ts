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
