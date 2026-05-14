/**
 * PDP related-products strip below `lg`: always two cards per horizontal page
 * (arrow scroll + dots stay in sync with {@link useHomeBestChoiceCarouselPageSync}).
 */
export const RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE = 2;

/**
 * Wrapper for prev/next beside the mobile section title (5px right via `translate-x-[5px]`;
 * literal required for Tailwind JIT).
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
