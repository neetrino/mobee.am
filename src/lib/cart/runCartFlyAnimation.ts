import {
  CART_FLY_LAYER_Z_INDEX,
  CART_FLY_TOTAL_DURATION_MS,
} from './cart-fly-animation.constants';
import type { CartFlyFromRect } from './cart-fly-animation.types';
import { getCartFlyTargetCenter } from './getCartFlyTargetCenter';

const MIN_SCALE = 0.1;
const PHASE_END_BIG = 0.1;
const PHASE_2 = 0.28;
const PHASE_3 = 0.48;
const PHASE_4 = 0.72;

/**
 * Creates a fixed clone, animates scale + translation toward the cart anchor, then removes the node.
 */
export function runCartFlyAnimation(
  imageUrl: string,
  from: CartFlyFromRect,
  onComplete: () => void,
): void {
  const target = getCartFlyTargetCenter();
  if (!target) {
    queueMicrotask(onComplete);
    return;
  }

  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const dx = target.x - sx;
  const dy = target.y - sy;

  const el = document.createElement('img');
  el.src = imageUrl;
  el.alt = '';
  el.decoding = 'async';
  el.setAttribute('aria-hidden', 'true');

  const { left, top, width, height } = from;
  el.style.position = 'fixed';
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.zIndex = String(CART_FLY_LAYER_Z_INDEX);
  el.style.pointerEvents = 'none';
  el.style.objectFit = 'cover';
  el.style.borderRadius = '10px';
  el.style.boxShadow = '0 10px 28px rgba(0,0,0,0.2)';
  el.style.transformOrigin = '50% 50%';

  document.body.appendChild(el);

  const keyframes: Keyframe[] = [
    { transform: 'translate(0px, 0px) scale(1)', offset: 0 },
    { transform: 'translate(0px, 0px) scale(1.12)', offset: PHASE_END_BIG },
    { transform: `translate(${dx * 0.18}px, ${dy * 0.18}px) scale(0.9)`, offset: PHASE_2 },
    { transform: `translate(${dx * 0.42}px, ${dy * 0.42}px) scale(0.62)`, offset: PHASE_3 },
    { transform: `translate(${dx * 0.68}px, ${dy * 0.68}px) scale(0.34)`, offset: PHASE_4 },
    { transform: `translate(${dx}px, ${dy}px) scale(${MIN_SCALE})`, offset: 1 },
  ];

  const anim = el.animate(keyframes, {
    duration: CART_FLY_TOTAL_DURATION_MS,
    easing: 'cubic-bezier(0.22, 0.65, 0.28, 0.998)',
    fill: 'forwards',
  });

  const finish = () => {
    el.remove();
    onComplete();
  };

  anim.onfinish = finish;
  anim.oncancel = finish;
}
