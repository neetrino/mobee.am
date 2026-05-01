'use client';

import Image from 'next/image';
import { SITE_LOGO_PATH, SITE_LOGO_SIZE_PX } from '../lib/brand.constants';

export interface SiteBrandLogoProps {
  /**
   * Accessible description when the image conveys the brand alone.
   * Use `decorative` with a parent-provided `aria-label` on a link/button to avoid duplicate announcements.
   */
  alt: string;
  /** When true, `alt` is forced to empty (parent must expose the name, e.g. `aria-label` on a link). */
  decorative?: boolean;
  /** Tailwind classes controlling rendered box (square asset). */
  sizeClass:
    | 'h-8 w-8'
    | 'h-9 w-9'
    | 'h-10 w-10'
    | 'h-11 w-11'
    | 'h-12 w-12'
    | 'h-14 w-14'
    | 'h-16 w-16';
  className?: string;
  priority?: boolean;
}

/**
 * Official MOBEE logo for header, footer, auth, and admin chrome — same asset for every locale.
 */
export function SiteBrandLogo({
  alt,
  decorative = false,
  sizeClass,
  className = '',
  priority = false,
}: SiteBrandLogoProps) {
  return (
    <Image
      src={SITE_LOGO_PATH}
      alt={decorative ? '' : alt}
      width={SITE_LOGO_SIZE_PX}
      height={SITE_LOGO_SIZE_PX}
      priority={priority}
      className={`object-contain ${sizeClass} ${className}`.trim()}
    />
  );
}
