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
 * Figma mobee-new node 180:1419 — mobile primary strip center logo frame (Overlay+Shadow group size).
 */
export const MOBILE_HEADER_CENTER_LOGO_SIZE_PX = 40;

/**
 * Figma mobee-new node 180:1419 — corner radius on the center mark.
 */
export const MOBILE_HEADER_CENTER_LOGO_RADIUS_PX = 12;

/**
 * Mobile primary strip menu (hamburger) glyph: 2px bars + 2px gap (wrap has no fixed height, so
 * bars are not squished — reads a bit thinner than the 2.5–3px tuning pass).
 */
export const MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS =
  'flex w-[18px] shrink-0 flex-col justify-center gap-[2px]';

export const MOBILE_PRIMARY_MENU_BAR_CLASS = 'h-[2px] w-full rounded-full bg-black';

/** Primary strip peek (scroll-up) and docked bar offset — duration (ms). */
export const HEADER_PRIMARY_PEEK_TRANSITION_MS = 280;

export const HEADER_PRIMARY_PEEK_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const HEADER_PRIMARY_PEEK_DURATION = `${HEADER_PRIMARY_PEEK_TRANSITION_MS}ms`;

/** Inline styles for `transform` slide on peeking strips. */
export const HEADER_PRIMARY_PEEK_STRIP_MOTION_STYLE = {
  transitionProperty: 'transform',
  transitionDuration: HEADER_PRIMARY_PEEK_DURATION,
  transitionTimingFunction: HEADER_PRIMARY_PEEK_EASING,
} as const;

/** Inline styles for fixed search / secondary `top` offset. */
export const HEADER_PRIMARY_PEEK_TOP_MOTION_STYLE = {
  transitionProperty: 'top',
  transitionDuration: HEADER_PRIMARY_PEEK_DURATION,
  transitionTimingFunction: HEADER_PRIMARY_PEEK_EASING,
} as const;

/** Inline styles for flow spacer `height` when peek toggles. */
export const HEADER_PRIMARY_PEEK_HEIGHT_MOTION_STYLE = {
  transitionProperty: 'height',
  transitionDuration: HEADER_PRIMARY_PEEK_DURATION,
  transitionTimingFunction: HEADER_PRIMARY_PEEK_EASING,
} as const;
