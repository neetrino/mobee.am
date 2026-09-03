'use client';

import dynamic from 'next/dynamic';
import { LazyWhenVisible } from './LazyWhenVisible';
import { LAZY_VISIBLE_FOOTER_ROOT_MARGIN } from '@/lib/performance/lazy-visible.constants';

const Footer = dynamic(
  () => import('./Footer').then((module) => ({ default: module.Footer })),
  {
    loading: () => <FooterLazyPlaceholder />,
  },
);

function FooterLazyPlaceholder() {
  return (
    <footer
      className="min-h-[96px] border-t border-[#eee] bg-white max-lg:border-t-0 max-lg:bg-gray-50 lg:min-h-[440px]"
      aria-hidden
    />
  );
}

/** Footer (legal bar always; desktop columns from lg) — deferred until near page bottom. */
export function DeferredFooter() {
  return (
    <LazyWhenVisible
      fallback={<FooterLazyPlaceholder />}
      rootMargin={LAZY_VISIBLE_FOOTER_ROOT_MARGIN}
    >
      <Footer />
    </LazyWhenVisible>
  );
}
