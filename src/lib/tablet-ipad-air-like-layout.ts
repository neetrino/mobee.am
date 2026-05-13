import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '@/lib/layout-breakpoints.constants';
import { TABLET_IPAD_AIR_LIKE_MAX_VIEWPORT_WIDTH_EXCLUSIVE_PX } from '@/lib/tablet-ipad-air-like-layout.constants';

/**
 * Viewports from site desktop `lg` ({@link LAYOUT_DESKTOP_MIN_WIDTH_PX}) up to (but not including)
 * {@link TABLET_IPAD_AIR_LIKE_MAX_VIEWPORT_WIDTH_EXCLUSIVE_PX}: shared large-tablet / iPad Air–style chrome.
 */
export function computeTabletIpadAirLikeLayoutActive(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const widthPx = window.innerWidth;
  return (
    widthPx >= LAYOUT_DESKTOP_MIN_WIDTH_PX &&
    widthPx < TABLET_IPAD_AIR_LIKE_MAX_VIEWPORT_WIDTH_EXCLUSIVE_PX
  );
}
