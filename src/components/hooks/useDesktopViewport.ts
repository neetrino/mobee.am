'use client';

import { useEffect, useState } from 'react';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '@/lib/layout-breakpoints.constants';

/**
 * True when viewport is at least storefront desktop (`lg`, 900px).
 * Defaults false until mount to avoid mounting desktop-only UI on mobile first paint.
 */
export function useDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const onChange = () => {
      setIsDesktop(mq.matches);
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, []);

  return isDesktop;
}
