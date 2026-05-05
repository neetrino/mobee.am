'use client';

import Link from 'next/link';
import { SiteBrandLogo } from './SiteBrandLogo';

interface AuthPageBrandMarkProps {
  homeAriaLabel: string;
  siteLogoAlt: string;
}

/** MOBEE logo above login / register — same asset for all locales. */
export function AuthPageBrandMark({ homeAriaLabel, siteLogoAlt }: AuthPageBrandMarkProps) {
  return (
    <div className="mb-8 flex justify-center">
      <Link
        href="/"
        aria-label={homeAriaLabel}
        className="inline-flex max-w-[min(340px,calc(100vw-2rem))] justify-center transition-opacity hover:opacity-95 active:opacity-90"
      >
        <SiteBrandLogo decorative alt={siteLogoAlt} heightClass="h-11" />
      </Link>
    </div>
  );
}
