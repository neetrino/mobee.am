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

/** Tailwind `theme.screens.md` — must match `tailwind.config.ts`. */
export const TAILWIND_MD_MIN_WIDTH_PX = 768;

/** Viewport max width just below storefront `lg` (e.g. iPad Mini portrait three-column band). */
export const SHOP_TABLET_THREE_COL_MAX_WIDTH_PX = LAYOUT_DESKTOP_MIN_WIDTH_PX - 1;

/**
 * Between `md` and storefront `lg`: shop grid matches home tablet density (three columns).
 */
export const SHOP_TABLET_THREE_COL_MEDIA_QUERY = `(min-width: ${TAILWIND_MD_MIN_WIDTH_PX}px) and (max-width: ${SHOP_TABLET_THREE_COL_MAX_WIDTH_PX}px)`;

/**
 * Tailwind `xl` — wide desktop: legacy shop (list/grid toggle, three-column grid).
 * Keep in sync with `theme.screens.xl` in `tailwind.config.ts`.
 */
export const SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX = 1280;

export const SHOP_LEGACY_DESKTOP_MEDIA_QUERY = `(min-width: ${SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX}px)`;
