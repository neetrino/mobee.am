'use client';

import { useLayoutEffect, useState } from 'react';

const MIN_PRO_SHORT_SIDE_PX = 834;
const MAX_PRO_LONG_SIDE_PX = 1366;

/**
 * Home desktop grid: three columns only on large iPad (iPad Pro class), not mini/Air narrow side, not desktop.
 * Does not rely on `pointer: coarse` — iPad “desktop website” can report fine pointer and would keep 4 columns otherwise.
 */
function computeIpadProHomeDesktopGrid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent;
  if (/\biPhone\b|\biPod\b/.test(ua)) {
    return false;
  }
  if (/\bAndroid\b/.test(ua) || /\bWindows\b/.test(ua)) {
    return false;
  }

  const isAppleTablet =
    /\biPad\b/.test(ua) ||
    navigator.platform === 'iPad' ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints >= 1);

  if (!isAppleTablet) {
    return false;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);

  if (minSide < MIN_PRO_SHORT_SIDE_PX) {
    return false;
  }
  if (maxSide > MAX_PRO_LONG_SIDE_PX) {
    return false;
  }

  return true;
}

export function useIpadProHomeDesktopGrid(): boolean {
  const [value, setValue] = useState(false);

  useLayoutEffect(() => {
    const apply = () => setValue(computeIpadProHomeDesktopGrid());
    apply();
    window.addEventListener('resize', apply);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      vv?.removeEventListener('resize', apply);
    };
  }, []);

  return value;
}
