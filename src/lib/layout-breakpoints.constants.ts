/**
 * Minimum viewport width for the desktop shell (header rows, home hero desktop, `lg:` utilities).
 * Aligned with Tailwind `theme.screens.lg` in `tailwind.config.ts`.
 *
 * 900px keeps narrow tablets and ~853×1280 viewports on the **mobile** shell; full desktop chrome from 900px up.
 */
export const LAYOUT_DESKTOP_MIN_WIDTH_PX = 900;

/** Widths below {@link LAYOUT_DESKTOP_MIN_WIDTH_PX} — for raw CSS / `sizes` (e.g. `max-width: …px`). */
export const LAYOUT_DESKTOP_MAX_MOBILE_WIDTH_PX = LAYOUT_DESKTOP_MIN_WIDTH_PX - 1;

/** For `window.matchMedia` — keep in sync with {@link LAYOUT_DESKTOP_MIN_WIDTH_PX}. */
export const LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY = `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX}px)`;

/** Tailwind `theme.screens.md` — must match `tailwind.config.ts`. */
export const TAILWIND_MD_MIN_WIDTH_PX = 768;

/** For `window.matchMedia` — keep in sync with Tailwind `md`. */
export const TAILWIND_MD_MIN_WIDTH_MEDIA_QUERY = `(min-width: ${TAILWIND_MD_MIN_WIDTH_PX}px)`;

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
 * for viewports from site `lg` through ~1366px. Wider viewports use the default footer CTA pill.
 */
export const HOME_DESKTOP_CAROUSEL_HOMESTYLE_MAX_WIDTH_PX = 1366;

export const HOME_DESKTOP_CAROUSEL_HOMESTYLE_MEDIA_QUERY = `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX}px) and (max-width: ${HOME_DESKTOP_CAROUSEL_HOMESTYLE_MAX_WIDTH_PX}px)`;
