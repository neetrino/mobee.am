'use client';

import Image from 'next/image';
import {
  SITE_WORDMARK_HEIGHT_PX,
  SITE_WORDMARK_PATH,
  SITE_WORDMARK_WIDTH_PX,
} from '../lib/brand.constants';

export type SiteBrandLogoHeightClass =
  | 'h-7'
  | 'h-8'
  | 'h-9'
  | 'h-[1.125rem]'
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
  /** Tailwind height class; width follows intrinsic aspect ratio, capped by `max-w-full` on the parent. */
  heightClass: SiteBrandLogoHeightClass;
  className?: string;
  priority?: boolean;
}

/**
 * MOBEE wordmark for header, auth, and admin chrome (storefront footer uses text, not this asset).
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
      src={SITE_WORDMARK_PATH}
      alt={decorative ? '' : alt}
      width={SITE_WORDMARK_WIDTH_PX}
      height={SITE_WORDMARK_HEIGHT_PX}
      priority={priority}
      className={`bg-transparent max-h-full w-auto max-w-full object-contain ${heightClass} ${className}`.trim()}
    />
  );
}
