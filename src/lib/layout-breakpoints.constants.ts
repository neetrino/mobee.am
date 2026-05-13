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

/**
 * Tailwind `xl` — wide desktop: legacy shop (list/grid toggle, three-column grid).
 * Keep in sync with `theme.screens.xl` in `tailwind.config.ts`.
 */
export const SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX = 1280;

export const SHOP_LEGACY_DESKTOP_MEDIA_QUERY = `(min-width: ${SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX}px)`;

/**
 * Max width for the three-column compact shop band (below storefront `lg`).
 * iPad Pro and wider use two columns until `xl` legacy desktop.
 */
export const SHOP_COMPACT_THREE_COLUMN_MAX_WIDTH_PX = LAYOUT_DESKTOP_MIN_WIDTH_PX - 1;

export const SHOP_COMPACT_THREE_COLUMN_MEDIA_QUERY = `(min-width: ${TAILWIND_MD_MIN_WIDTH_PX}px) and (max-width: ${SHOP_COMPACT_THREE_COLUMN_MAX_WIDTH_PX}px)`;

/**
 * Home desktop product carousel (`lg+`): use the same Figma card chrome as mobile (round cart, etc.)
 * for iPad Pro through 12.9″ landscape (~1366px). Wider viewports use the default footer CTA pill.
 */
export const HOME_DESKTOP_CAROUSEL_HOMESTYLE_MAX_WIDTH_PX = 1366;

export const HOME_DESKTOP_CAROUSEL_HOMESTYLE_MEDIA_QUERY = `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX}px) and (max-width: ${HOME_DESKTOP_CAROUSEL_HOMESTYLE_MAX_WIDTH_PX}px)`;
