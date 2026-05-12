'use client';

import { useLayoutEffect, useState } from 'react';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../../../lib/layout-breakpoints.constants';

/**
 * `true` when viewport matches storefront desktop breakpoint (`lg` in Tailwind).
 */
export function useProfileDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return isDesktop;
}
