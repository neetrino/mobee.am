import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '@/lib/layout-breakpoints.constants';

/**
 * PDP iPad Pro class band (900–1279 CSS px, below Tailwind `xl` / legacy desktop).
 * Tailwind uses literal `900` and `max-xl` — keep in sync with `LAYOUT_DESKTOP_MIN_WIDTH_PX` and `theme.screens.xl`.
 */
const PDP_IPAD_PRO_TAILWIND_MIN = 900 as const;

if (LAYOUT_DESKTOP_MIN_WIDTH_PX !== PDP_IPAD_PRO_TAILWIND_MIN) {
  throw new Error(
    'product-pdp-ipad-pro-band: update PDP_IPAD_PRO_TAILWIND_MIN and Tailwind `min-[900px]` classes',
  );
}

/** Quantity + price row: default `justify-between`; iPad Pro band clusters both blocks to the left. */
export const PDP_IPAD_PRO_BAND_QTY_PRICE_ROW_CLASS =
  'justify-between min-[900px]:max-xl:justify-start' as const;

/** Price / discount block: left-align in iPad Pro band. */
export const PDP_IPAD_PRO_BAND_PRICE_TEXT_CLASS =
  'min-[900px]:max-xl:justify-start min-[900px]:max-xl:text-left xl:justify-end xl:text-right' as const;

/** Main PDP shell: symmetric horizontal padding from `lg` (incl. iPad Pro band). */
export const PDP_IPAD_PRO_BAND_MAIN_SHELL_HORIZONTAL_CLASS = 'lg:pl-8 lg:pr-8' as const;

/** Prevent horizontal page scroll from carousel bleed / wide rows (iPad Pro band). */
export const PDP_IPAD_PRO_BAND_CLIP_HORIZONTAL_OVERFLOW_CLASS =
  'w-full min-[900px]:max-xl:overflow-x-hidden' as const;

/** Primary CTA: default full `flex-1` + `min-w-[12rem]`; iPad Pro band — shorter bar (`flex-none`, lower min/max width). */
export const PDP_IPAD_PRO_BAND_ADD_TO_CART_NARROW_CLASS =
  'min-[900px]:max-xl:flex-none min-[900px]:max-xl:min-w-[10rem] min-[900px]:max-xl:max-w-[13rem]' as const;
