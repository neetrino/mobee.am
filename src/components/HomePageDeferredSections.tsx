'use client';

import dynamic from 'next/dynamic';
import { LazyWhenVisible } from './LazyWhenVisible';
import { LAZY_VISIBLE_HOME_SECTIONS_ROOT_MARGIN } from '@/lib/performance/lazy-visible.constants';

const FeaturedIntroHeading = dynamic(
  () =>
    import('./FeaturedIntroHeading').then((module) => ({
      default: module.FeaturedIntroHeading,
    })),
  {
    loading: () => <FeaturedIntroHeadingPlaceholder />,
  },
);

const HomeProductSections = dynamic(
  () =>
    import('./FeaturedProductsTabs').then((module) => ({
      default: module.HomeProductSections,
    })),
  {
    loading: () => <HomeProductSectionsPlaceholder />,
  },
);

function FeaturedIntroHeadingPlaceholder() {
  return (
    <div className="hidden h-[120px] bg-white lg:block" aria-hidden>
      <div className="mx-auto h-full max-w-7xl animate-pulse px-4 sm:px-6 lg:px-8">
        <div className="h-9 w-64 rounded bg-gray-100" />
        <div className="mt-2 h-6 w-96 max-w-full rounded bg-gray-100" />
      </div>
    </div>
  );
}

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
    <>
      <LazyWhenVisible fallback={<FeaturedIntroHeadingPlaceholder />}>
        <FeaturedIntroHeading />
      </LazyWhenVisible>

      <LazyWhenVisible
        fallback={<HomeProductSectionsPlaceholder />}
        minHeight="480px"
        rootMargin={LAZY_VISIBLE_HOME_SECTIONS_ROOT_MARGIN}
      >
        <HomeProductSections />
      </LazyWhenVisible>
    </>
  );
}
