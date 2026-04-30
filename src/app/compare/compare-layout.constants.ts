/**
 * Compare page layout — two cumulative +20% steps from Tailwind baselines
 * (`max-w-screen-2xl` 1536px, `min-w-44` / `min-w-64`, `w-40` thumb).
 * Arbitrary rem/px values stay explicit so Tailwind JIT can scan this file.
 */

/** Matches Tailwind `max-w-screen-2xl` reference width */
const SCREEN_2XL_REFERENCE_PX = 1536;

/** Applied twice vs the original layout (1.2 × 1.2) */
const COMPARE_LAYOUT_CUMULATIVE_SCALE = 1.44;

export const COMPARE_CONTENT_MAX_WIDTH_PX = Math.round(
  SCREEN_2XL_REFERENCE_PX * COMPARE_LAYOUT_CUMULATIVE_SCALE,
);

/** 11rem (`min-w-44`) × cumulative scale */
export const COMPARE_STICKY_COLUMN_MIN_CLASS = 'min-w-[15.84rem]';

/** 16rem (`min-w-64`) × cumulative scale */
export const COMPARE_PRODUCT_COLUMN_MIN_CLASS = 'min-w-[23.04rem]';

/** 160px × cumulative scale for `next/image` `sizes` */
export const COMPARE_PRODUCT_IMAGE_SIZES_ATTR = '230px';

/** `w-48` (12rem) × one +20% step vs previous pass */
export const COMPARE_PRODUCT_THUMB_BOX_CLASS = 'w-[14.4rem] h-[14.4rem]';

/** `px-6 py-6` (1.5rem) × one +20% step */
export const COMPARE_TABLE_CELL_PADDING_CLASS = 'px-[1.8rem] py-[1.8rem]';

/** `max-w-2xl` (42rem) × one +20% step — empty compare panel width */
export const COMPARE_EMPTY_STATE_MAX_WIDTH_CLASS = 'max-w-[50.4rem]';

/** `h-24 w-24` (6rem) × one +20% step — empty compare icon */
export const COMPARE_EMPTY_STATE_ICON_CLASS = 'h-[7.2rem] w-[7.2rem]';

/** Static empty-state illustration (Figma node 265:770, mobee-new) */
export const COMPARE_EMPTY_STATE_IMAGE_SRC = '/images/compare-empty-state.png';

/** `sizes` for empty-state `next/image` — matches icon box ~7.2rem width */
export const COMPARE_EMPTY_STATE_IMAGE_SIZES_ATTR = '115px';

/**
 * Small padding below empty-state CTA before the site footer (site chrome already adds mobile nav inset).
 * Literal for Tailwind JIT.
 */
export const COMPARE_EMPTY_STATE_FOOTER_GAP_CLASS = 'pb-6';

/**
 * Fills viewport under header + compare page title so copy and CTA sit at the lowest practical position.
 * `10rem` ≈ header + title row + page vertical padding (tune if chrome heights change).
 * Literal for Tailwind JIT.
 */
export const COMPARE_EMPTY_STATE_LOWER_PANEL_MIN_HEIGHT_CLASS =
  'min-h-[calc(100svh-10rem)]';

/**
 * Flex column: anchor empty-state copy and button toward the bottom of the min-height panel.
 * Literal for Tailwind JIT.
 */
export const COMPARE_EMPTY_STATE_LOWER_PANEL_FLEX_CLASS =
  'flex flex-col justify-end items-center';

/**
 * Tight gap between description and browse-products CTA (text sits right above button).
 * Literal for Tailwind JIT.
 */
export const COMPARE_EMPTY_STATE_BROWSE_BUTTON_TOP_OFFSET_CLASS = 'mt-3';

