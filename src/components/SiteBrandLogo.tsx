'use client';

import Image from 'next/image';
import {
  SITE_LOGO_INTRINSIC_HEIGHT,
  SITE_LOGO_INTRINSIC_WIDTH,
  SITE_LOGO_PATH,
} from '../lib/brand.constants';

export type SiteBrandLogoHeightClass =
  | 'h-8'
  | 'h-9'
  | 'h-10'
  | 'h-11'
  | 'h-12'
  | 'h-14'
  | 'h-16';

export interface SiteBrandLogoProps {
  /**
   * Accessible description when the image conveys the brand alone.
   * Use `decorative` with a parent-provided `aria-label` on a link/button to avoid duplicate announcements.
   */
  alt: string;
  /** When true, `alt` is forced to empty (parent must expose the name, e.g. `aria-label` on a link). */
  decorative?: boolean;
  /** Tailwind height for the wordmark; width follows intrinsic aspect ratio (capped via `className` when needed). */
  heightClass: SiteBrandLogoHeightClass;
  className?: string;
  priority?: boolean;
}

/**
 * MOBEE wordmark for header, auth, admin chrome, and error pages — same SVG for every locale.
 * Footer legal strip keeps text-only brand (see `FooterPaymentStrip`).
 */
export function SiteBrandLogo({
  alt,
  decorative = false,
  heightClass,
  className = '',
  priority = false,
}: SiteBrandLogoProps) {
  return (
    <Image
      src={SITE_LOGO_PATH}
      alt={decorative ? '' : alt}
      width={SITE_LOGO_INTRINSIC_WIDTH}
      height={SITE_LOGO_INTRINSIC_HEIGHT}
      priority={priority}
      unoptimized
      className={`${heightClass} w-auto object-contain object-center ${className}`.trim()}
    />
  );
}
