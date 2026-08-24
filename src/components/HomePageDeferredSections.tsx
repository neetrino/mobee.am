'use client';

import dynamic from 'next/dynamic';
import { LazyWhenVisible } from './LazyWhenVisible';
import { LAZY_VISIBLE_HOME_SECTIONS_ROOT_MARGIN } from '@/lib/performance/lazy-visible.constants';

const HomeProductSections = dynamic(
  () =>
    import('./FeaturedProductsTabs').then((module) => ({
      default: module.HomeProductSections,
    })),
  {
    loading: () => <HomeProductSectionsPlaceholder />,
  },
);

function HomeProductSectionsPlaceholder() {
  return (
    <div
      className="w-full animate-pulse bg-gray-50 pt-2 lg:min-h-[520px] lg:pb-16"
      aria-hidden
    />
  );
}

/** Below-the-fold home blocks — code-split and viewport-deferred. */
export function HomePageDeferredSections() {
  return (
    <LazyWhenVisible
      fallback={<HomeProductSectionsPlaceholder />}
      minHeight="480px"
      rootMargin={LAZY_VISIBLE_HOME_SECTIONS_ROOT_MARGIN}
    >
      <HomeProductSections />
    </LazyWhenVisible>
  );
}
