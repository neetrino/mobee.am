import { CART_FLY_DESKTOP_MIN_WIDTH_PX } from './cart-fly-animation.constants';

/**
 * Returns the center of the visible cart control (desktop header vs mobile bottom bar).
 */
export function getCartFlyTargetCenter(): { x: number; y: number } | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const isDesktop = window.matchMedia(`(min-width: ${CART_FLY_DESKTOP_MIN_WIDTH_PX}px)`).matches;
  const selector = isDesktop ? '[data-cart-fly-target="desktop"]' : '[data-cart-fly-target="mobile"]';
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    return null;
  }

  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) {
    return null;
  }

  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
