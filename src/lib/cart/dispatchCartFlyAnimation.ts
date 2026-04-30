import { CART_FLY_ANIMATION_EVENT } from './cart-fly-animation.constants';
import type { CartFlyFromRect } from './cart-fly-animation.types';

/**
 * Queues a flying product thumbnail toward the header / bottom cart control.
 */
export function dispatchCartFlyAnimation(imageUrl: string, sourceEl: Element | null): void {
  if (typeof window === 'undefined' || !sourceEl || !imageUrl) {
    return;
  }

  const r = sourceEl.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) {
    return;
  }

  const fromRect: CartFlyFromRect = {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };

  window.dispatchEvent(
    new CustomEvent(CART_FLY_ANIMATION_EVENT, {
      detail: { imageUrl, fromRect },
    }),
  );
}
