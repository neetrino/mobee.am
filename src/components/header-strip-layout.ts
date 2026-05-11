import type { CSSProperties } from 'react';

/**
 * Shared layout for the main header strip ({@link Header}) and matching storefront sections.
 */
export const HEADER_STRIP_PADDING_Y =
  'py-[0.45rem] sm:py-[0.6rem] lg:py-[0.6rem]';

/** Applied only where the full-width strip should match the other bar’s height (lg+). */
export const HEADER_STRIP_MIN_HEIGHT_LG = 'lg:min-h-[62px]';

export const HEADER_STRIP_INNER_ROW = `items-center ${HEADER_STRIP_PADDING_Y} ${HEADER_STRIP_MIN_HEIGHT_LG}`;

/**
 * Max width + horizontal padding; matches hero/promo ({@link HeroCarousel}) so nav strips align with content.
 * `lg` uses modest side padding so desktop chrome (nav + search + icons) fits on iPad Pro width without overflow;
 * `xl` restores generous gutters on wide screens.
 */
export const SITE_CONTENT_GUTTERS_CLASS =
  'mx-auto w-full min-w-0 max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-6 xl:px-16 2xl:px-20';

/**
 * Mobile hero strip (`lg:hidden`): slightly tighter padding than {@link SITE_CONTENT_GUTTERS_CLASS}
 * so the promo card reads a bit wider.
 */
export const HERO_MOBILE_CONTENT_GUTTERS_CLASS =
  'mx-auto w-full max-w-[1440px] px-3 sm:px-5 md:px-8';

/**
 * Figma mobee-new node 180:1419 — mobile primary strip center logo frame (Overlay+Shadow group size).
 */
export const MOBILE_HEADER_CENTER_LOGO_SIZE_PX = 40;

/**
 * Figma mobee-new node 180:1419 — corner radius on the center mark.
 */
export const MOBILE_HEADER_CENTER_LOGO_RADIUS_PX = 12;

/**
 * Desktop primary strip wordmark — 50% of Tailwind `h-9` (2.25rem × 0.5 = 1.125rem).
 */
export const HEADER_DESKTOP_BRAND_LOGO_HEIGHT_CLASS = 'h-[1.125rem]' as const;

/**
 * Mobile primary strip menu (hamburger) glyph: 2px bars + 2px gap (wrap has no fixed height, so
 * bars are not squished — reads a bit thinner than the 2.5–3px tuning pass).
 */
export const MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS =
  'flex w-[18px] shrink-0 flex-col justify-center gap-[2px]';

export const MOBILE_PRIMARY_MENU_BAR_CLASS = 'h-[2px] w-full rounded-full bg-black';

/** Mobile strip — open main menu (same chrome as storefront header burger). */
export const MOBILE_PRIMARY_MENU_OPEN_BUTTON_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400';

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

/**
 * Animate `top` only while a docked bar sits below a peeking primary strip.
 * When `top` returns to 0, skip transition so the viewport does not briefly show page content above the bar.
 */
export function getDockedBarTopMotionStyle(peekOffsetPx: number): CSSProperties {
  if (peekOffsetPx > 0) {
    return { ...HEADER_PRIMARY_PEEK_TOP_MOTION_STYLE };
  }
  return { transitionProperty: 'none' };
}

/** Inline styles for flow spacer `height` when peek toggles. */
export const HEADER_PRIMARY_PEEK_HEIGHT_MOTION_STYLE = {
  transitionProperty: 'height',
  transitionDuration: HEADER_PRIMARY_PEEK_DURATION,
  transitionTimingFunction: HEADER_PRIMARY_PEEK_EASING,
} as const;
