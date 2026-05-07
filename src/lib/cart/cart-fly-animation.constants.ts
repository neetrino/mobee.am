import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '../layout-breakpoints.constants';

/** CustomEvent name — must match listeners in `CartFlyAnimationLayer`. */
export const CART_FLY_ANIMATION_EVENT = 'cart-fly-animation';

/** Desktop fly target — matches Tailwind `lg` / header secondary bar vs mobile chrome. */
export const CART_FLY_DESKTOP_MIN_WIDTH_PX = LAYOUT_DESKTOP_MIN_WIDTH_PX;

export const CART_FLY_LAYER_Z_INDEX = 10050;

export const CART_FLY_TOTAL_DURATION_MS = 780;
