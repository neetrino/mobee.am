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
