'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  LAZY_VISIBLE_DEFAULT_ROOT_MARGIN,
  LAZY_VISIBLE_OBSERVER_THRESHOLD,
} from '@/lib/performance/lazy-visible.constants';

export interface LazyWhenVisibleProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Reserve space before mount to limit CLS (CSS length, e.g. `480px`). */
  minHeight?: string;
  rootMargin?: string;
  className?: string;
}

/**
 * Mounts children only when the sentinel nears the viewport (IntersectionObserver).
 * Defers JS parse, hydration, and child data fetching until scroll/near-scroll.
 */
export function LazyWhenVisible({
  children,
  fallback = null,
  minHeight,
  rootMargin = LAZY_VISIBLE_DEFAULT_ROOT_MARGIN,
  className = '',
}: LazyWhenVisibleProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: LAZY_VISIBLE_OBSERVER_THRESHOLD },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin]);

  const style: CSSProperties | undefined = minHeight ? { minHeight } : undefined;

  return (
    <div ref={sentinelRef} className={className} style={style}>
      {isVisible ? children : fallback}
    </div>
  );
}
