/**
 * Shared layout for the main header strip ({@link Header}) and matching storefront sections.
 */
export const HEADER_STRIP_PADDING_Y =
  'py-[0.45rem] sm:py-[0.6rem] lg:py-[0.6rem]';

/** Applied only where the full-width strip should match the other bar’s height (lg+). */
export const HEADER_STRIP_MIN_HEIGHT_LG = 'lg:min-h-[62px]';

export const HEADER_STRIP_INNER_ROW = `items-center ${HEADER_STRIP_PADDING_Y} ${HEADER_STRIP_MIN_HEIGHT_LG}`;

/** Max width + horizontal padding; matches hero/promo ({@link HeroCarousel}) so nav strips align with content. */
export const SITE_CONTENT_GUTTERS_CLASS =
  'mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20';

/**
 * Initial flow spacer under the fixed mobile primary header (px) before ResizeObserver measures.
 */
export const MOBILE_PRIMARY_HEADER_SPACER_FALLBACK_PX = 72;
