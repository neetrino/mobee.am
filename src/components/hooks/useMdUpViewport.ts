'use client';

import { useEffect, useState } from 'react';
import { TAILWIND_MD_MIN_WIDTH_MEDIA_QUERY } from '../../lib/layout-breakpoints.constants';

/**
 * True when viewport is at least Tailwind `md` (tablet band for storefront shell).
 */
export function useMdUpViewport(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(TAILWIND_MD_MIN_WIDTH_MEDIA_QUERY);
    const onChange = () => {
      setMatches(mq.matches);
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, []);

  return matches;
}
