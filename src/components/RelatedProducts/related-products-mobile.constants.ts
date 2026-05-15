import {
  LAYOUT_DESKTOP_MIN_WIDTH_PX,
  SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX,
} from '@/lib/layout-breakpoints.constants';
import { HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA } from '../home-best-choice.constants';

/**
 * PDP related-products mobile strip: two cards per snap page on phones (same row as home 2×2 cell width).
 */
export const RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE = 2;

/**
 * Narrow tablet / iPad mini portrait band (744–899 CSS px): one row of three cards per snap page.
 * Same `matchMedia` band as home best-choice tablet pages — see {@link HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA}.
 */
export const RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI = 3;

/** Keep in sync with home carousel tablet band. */
export const RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY = HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA;

/**
 * Large tablet / iPad Pro class viewports (900–1279 CSS px): one row of four cards per snap page.
 * Upper bound matches Tailwind `xl` minus 1 — keep in sync with {@link SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX}.
 */
export const RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_PRO = 4;

const RELATED_PRODUCTS_IPAD_PRO_BAND_MAX_WIDTH_PX = SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX - 1;

export const RELATED_PRODUCTS_IPAD_PRO_BAND_MEDIA_QUERY = `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX}px) and (max-width: ${RELATED_PRODUCTS_IPAD_PRO_BAND_MAX_WIDTH_PX}px)`;

/**
 * Bleed mobile carousel into parent horizontal padding (`px-4` / `sm:px-6`) so cards are wider; grid gap unchanged.
 * Uses `xl` so iPad Pro (below legacy desktop) still bleeds like the home PDP mobile strip.
 */
export const RELATED_PRODUCTS_MOBILE_CAROUSEL_BLEED_CLASS =
  'max-xl:-mx-4 sm:max-xl:-mx-6 xl:mx-0';

/**
 * iPad Pro band (900–1279 CSS px): right gutter inside bleed so cards are not flush to the edge;
 * works with PDP `overflow-x-hidden` (no horizontal page scroll).
 */
export const RELATED_PRODUCTS_IPAD_PRO_CAROUSEL_RIGHT_INSET_CLASS =
  'min-[900px]:max-xl:pr-6' as const;

/**
 * PDP related-products mobile title-row controls (Tailwind class literals for JIT).
 */
export const RELATED_PRODUCTS_MOBILE_TITLE_NAV_GROUP_CLASS =
  'inline-flex translate-x-[12px] items-center gap-1.5';

/** Shared layout / motion for title-row prev/next. */
export const RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_BASE_CLASS =
  'flex h-9 min-w-11 shrink-0 items-center justify-center rounded-full border px-1.5 shadow-sm transition-[opacity,colors] disabled:pointer-events-none disabled:opacity-30';

/** Default + brief press tint before latch. */
export const RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_IDLE_CLASS =
  'border-gray-200 bg-white text-gray-800 active:border-[#2db2ff] active:bg-[#2db2ff]/15 active:text-[#2db2ff]';

/** Stays after tap until pointerdown outside the nav group (see RelatedProducts). */
export const RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_LATCHED_CLASS =
  'border-[#2db2ff] bg-[#2db2ff] text-white';
