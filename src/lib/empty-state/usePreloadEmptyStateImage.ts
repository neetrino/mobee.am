'use client';

import { useEffect } from 'react';

/**
 * Warm the browser cache for an empty-state illustration as soon as the route mounts,
 * so the image is ready when the empty panel appears after loading.
 */
export function usePreloadEmptyStateImage(src: string): void {
  useEffect(() => {
    if (!src) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.append(link);

    const img = new Image();
    img.src = src;

    return () => {
      link.remove();
    };
  }, [src]);
}
