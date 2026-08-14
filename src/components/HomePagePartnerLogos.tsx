'use client';

import dynamic from 'next/dynamic';
import { LazyWhenVisible } from './LazyWhenVisible';
import { LAZY_VISIBLE_DEFAULT_ROOT_MARGIN } from '@/lib/performance/lazy-visible.constants';

const PartnerLogosSection = dynamic(
  () =>
    import('./PartnerLogosSection').then((module) => ({
      default: module.PartnerLogosSection,
    })),
  {
    loading: () => <PartnerLogosPlaceholder />,
  },
);

function PartnerLogosPlaceholder() {
  return (
    <div
      className="mx-auto h-48 w-full max-w-6xl animate-pulse rounded-lg bg-gray-100"
      aria-hidden
    />
  );
}

/** Below-the-fold partner logos — code-split and viewport-deferred. */
export function HomePagePartnerLogos() {
  return (
    <LazyWhenVisible
      fallback={<PartnerLogosPlaceholder />}
      rootMargin={LAZY_VISIBLE_DEFAULT_ROOT_MARGIN}
    >
      <PartnerLogosSection />
    </LazyWhenVisible>
  );
}
