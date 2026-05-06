/**
 * Minimum viewport width for the desktop shell (header rows, home hero desktop, `lg:` utilities).
 * Aligned with Tailwind `theme.screens.lg` in `tailwind.config.ts`.
 *
 * Default Tailwind `lg` is 1024px, so iPad Pro 11" portrait (~834px) stayed on mobile chrome.
 * 834px matches that device; layout remains fluid between 834px and larger viewports.
 */
export const LAYOUT_DESKTOP_MIN_WIDTH_PX = 834;

/** For `window.matchMedia` — keep in sync with {@link LAYOUT_DESKTOP_MIN_WIDTH_PX}. */
export const LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY = `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX}px)`;
