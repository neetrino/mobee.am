'use client';

import { useLayoutEffect, useState } from 'react';
import { HOME_DESKTOP_CAROUSEL_HOMESTYLE_MEDIA_QUERY } from '@/lib/layout-breakpoints.constants';

/**
 * True when the home desktop horizontal carousel should use the same card chrome as mobile
 * (round cart button, Figma footer) — typically iPad Pro widths.
 */
export function useHomeDesktopCarouselHomeStyle(): boolean {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(HOME_DESKTOP_CAROUSEL_HOMESTYLE_MEDIA_QUERY);
    const apply = () => {
      setMatches(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
    };
  }, []);

  return matches;
}
