'use client';

import { Montserrat } from 'next/font/google';
import {
  ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_CLASS,
  ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_LETTER_CLASS,
} from '../admin-sidebar-layout.constants';

const montserratCollapsedMark = Montserrat({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export interface AdminSidebarCollapsedHomeMarkProps {
  className?: string;
}

/**
 * Figma mobee-new 178:526 (frame) + 178:527 (glyph): squircle + white “M”, Montserrat Bold 20/28.
 */
export function AdminSidebarCollapsedHomeMark({ className = '' }: AdminSidebarCollapsedHomeMarkProps) {
  const outer = `${ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_CLASS} ${className}`.trim();
  const inner = `${montserratCollapsedMark.className} ${ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_LETTER_CLASS}`.trim();

  return (
    <span className={outer} aria-hidden>
      <span className={inner}>M</span>
    </span>
  );
}
