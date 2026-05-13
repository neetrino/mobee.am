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

/** Empty-state illustration with transparent background. */
export const COMPARE_EMPTY_STATE_IMAGE_SRC =
  '/images/compare/compare-empty-state.png';

/** Intrinsic width/height for `next/image` source asset. */
export const COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_WIDTH_PX = 947;
export const COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_HEIGHT_PX = 836;

/** Responsive `sizes` for empty-state image; max column matches `COMPARE_EMPTY_STATE_IMAGE_DISPLAY_CLASS` cap */
export const COMPARE_EMPTY_STATE_IMAGE_SIZES_ATTR =
  '(max-width: 640px) 85vw, 320px';

/** Display width cap `20rem` (~320px); lighter than former 28rem wishlist parity */
export const COMPARE_EMPTY_STATE_IMAGE_DISPLAY_CLASS =
  'mx-auto h-auto w-[min(90vw,20rem)] max-w-full';

/**
 * Empty compare panel — same vertical rhythm as wishlist (`empty-wishlist.tsx`): top-weighted, not pinned to viewport bottom.
 */
export const COMPARE_EMPTY_STATE_WRAPPER_CLASS =
  'flex w-full flex-col items-center gap-7 pb-8 pt-4 text-center';

export const COMPARE_EMPTY_STATE_TEXT_BLOCK_CLASS =
  'flex w-full max-w-[328px] shrink-0 flex-col items-center gap-6 px-4';

export const COMPARE_EMPTY_STATE_HEADLINE_STACK_CLASS =
  'flex w-full flex-col items-center gap-4 text-center';

export const COMPARE_EMPTY_STATE_TITLE_CLASS =
  'max-w-[284px] text-2xl font-bold leading-[1.2] text-[#1c1b1b]';

export const COMPARE_EMPTY_STATE_DESCRIPTION_CLASS =
  'w-full max-w-[328px] text-sm leading-[1.5] tracking-[0.07px] text-[#6f7384]';

