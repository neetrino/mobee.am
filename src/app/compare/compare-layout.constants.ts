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

/** Baseline viewport-height padding before footer (first pass). */
const COMPARE_EMPTY_STATE_FOOTER_GAP_BASE_VH = 20;

/** +20% vs baseline (20 × 1.2 → 24vh in `COMPARE_EMPTY_STATE_FOOTER_GAP_CLASS`). */
const COMPARE_EMPTY_STATE_FOOTER_GAP_INCREASE_RATIO = 1.2;

const COMPARE_EMPTY_STATE_FOOTER_GAP_EFFECTIVE_VH = Math.round(
  COMPARE_EMPTY_STATE_FOOTER_GAP_BASE_VH * COMPARE_EMPTY_STATE_FOOTER_GAP_INCREASE_RATIO,
);

if (COMPARE_EMPTY_STATE_FOOTER_GAP_EFFECTIVE_VH !== 24) {
  throw new Error(
    'compare-layout: update COMPARE_EMPTY_STATE_FOOTER_GAP_CLASS literal to match EFFECTIVE_VH',
  );
}

/** Padding below empty-state CTA before site footer (literal for Tailwind JIT). */
export const COMPARE_EMPTY_STATE_FOOTER_GAP_CLASS = 'pb-[24vh]';

/**
 * Margin above browse-products CTA — 30% of viewport height (shifts button down).
 * Literal for Tailwind JIT.
 */
export const COMPARE_EMPTY_STATE_BROWSE_BUTTON_TOP_OFFSET_CLASS = 'mt-[30vh]';

