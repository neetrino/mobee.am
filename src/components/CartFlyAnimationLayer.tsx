'use client';

import { useEffect, useRef } from 'react';
import { CART_FLY_ANIMATION_EVENT } from '../lib/cart/cart-fly-animation.constants';
import type { CartFlyAnimationDetail } from '../lib/cart/cart-fly-animation.types';
import { runCartFlyAnimation } from '../lib/cart/runCartFlyAnimation';

/**
 * Listens for `cart-fly-animation` and plays a single flying thumbnail toward the real cart control.
 */
export function CartFlyAnimationLayer() {
  const busyRef = useRef(false);

  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<CartFlyAnimationDetail>;
      const { imageUrl, fromRect } = custom.detail ?? {};
      if (!imageUrl || !fromRect) {
        return;
      }
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      runCartFlyAnimation(imageUrl, fromRect, () => {
        busyRef.current = false;
      });
    };

    window.addEventListener(CART_FLY_ANIMATION_EVENT, handler);
    return () => window.removeEventListener(CART_FLY_ANIMATION_EVENT, handler);
  }, []);

  return null;
}
