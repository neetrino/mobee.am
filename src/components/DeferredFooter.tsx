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
      className="hidden min-h-[420px] border-t border-[#eee] bg-white lg:block"
      aria-hidden
    />
  );
}

/** Desktop footer — deferred until the user nears the page bottom. */
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
