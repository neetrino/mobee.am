import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '@/lib/layout-breakpoints.constants';
import {
  LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS,
  TABLET_IPAD_AIR_LIKE_MAX_VIEWPORT_WIDTH_EXCLUSIVE_PX,
} from '@/lib/tablet-ipad-air-like-layout.constants';

/**
 * Inline script for `next/script` `beforeInteractive`: toggles {@link LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS}
 * on `<html>` before paint/hydration — must stay aligned with {@link computeTabletIpadAirLikeLayoutActive}.
 */
export const TABLET_IPAD_AIR_LIKE_HTML_INIT_SCRIPT = `(function(){var d=document.documentElement;var w=window.innerWidth||0;var on=w>=${LAYOUT_DESKTOP_MIN_WIDTH_PX}&&w<${TABLET_IPAD_AIR_LIKE_MAX_VIEWPORT_WIDTH_EXCLUSIVE_PX};d.classList.toggle(${JSON.stringify(LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS)},on);})();` as const;

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
