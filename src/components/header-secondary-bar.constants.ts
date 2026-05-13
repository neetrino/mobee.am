/**
 * Categories pill in the secondary bar: `max-width` reserves this many `rem`
 * of viewport for search + trailing icons so the label can stay on one line.
 * Must match the numeric part of {@link HEADER_SECONDARY_CATEGORIES_PILL_MAX_WIDTH_CLASS}.
 */
export const HEADER_SECONDARY_CATEGORIES_PILL_VIEWPORT_RESERVE_REM = 18;

/**
 * Tailwind arbitrary `max-w` — literal string required for JIT scanning.
 * Update {@link HEADER_SECONDARY_CATEGORIES_PILL_VIEWPORT_RESERVE_REM} when changing.
 */
export const HEADER_SECONDARY_CATEGORIES_PILL_MAX_WIDTH_CLASS =
  "max-w-[calc(100vw-18rem)]" as const;

/**
 * Secondary search row: extra `max-w` when `ipad-air-band:` applies (large tablet chrome on `<html>`;
 * see `TabletIpadAirLikeLayoutProvider` / `tablet-ipad-air-like-layout`).
 * Literal for Tailwind JIT.
 */
export const HEADER_SECONDARY_SEARCH_IPAD_AIR_BAND_MAX_WIDTH_CLASS =
  'ipad-air-band:max-w-[320px]' as const;
