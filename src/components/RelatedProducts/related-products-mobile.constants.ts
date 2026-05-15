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
 * Bleed mobile carousel into parent horizontal padding (`px-4` / `sm:px-6`) so cards are wider; grid gap unchanged.
 */
export const RELATED_PRODUCTS_MOBILE_CAROUSEL_BLEED_CLASS =
  'max-lg:-mx-4 sm:max-lg:-mx-6 lg:mx-0';

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
