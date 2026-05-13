'use client';

import { useTabletIpadAirLikeLayoutActive } from './TabletIpadAirLikeLayoutProvider';

/**
 * True when the home desktop horizontal carousel should use the same card chrome as mobile
 * (round cart, Figma footer) — viewports from `lg` up to (but not including) 1300px width.
 */
export function useHomeDesktopCarouselHomeStyle(): boolean {
  return useTabletIpadAirLikeLayoutActive();
}
