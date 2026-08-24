'use client';

import { useEffect, useRef } from 'react';

/**
 * After the first paint, smoothly scrolls the window to the top when `page` changes
 * (shop catalog pagination). Skips the initial mount so landing mid-page is not forced.
 */
export function useSmoothScrollToTopOnPageChange(page: number): void {
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);
}
