'use client';

import { Link } from '@/lib/i18n/navigation';
import { useLayoutEffect, useRef } from 'react';
import type { AnimationEvent } from 'react';
import {
  MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS,
  MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS,
  MOBILE_HEADER_DROPDOWN_BACKDROP_CLASS,
  MOBILE_HEADER_DROPDOWN_NAV_LINK_CLASS,
  MOBILE_HEADER_DROPDOWN_PANEL_CLASS,
  MOBILE_HEADER_DROPDOWN_PANEL_MOTION_IN_CLASS,
  MOBILE_HEADER_DROPDOWN_PANEL_MOTION_OUT_CLASS,
} from './mobile-drawer-nav.constants';

const DROPDOWN_VIEWPORT_GAP_PX = 12;
const DROPDOWN_HEADER_GAP_PX = 8;

type MobileHeaderDropdownProps = {
  pathname: string;
  exiting: boolean;
  aboutLabel: string;
  contactLabel: string;
  policiesLabel: string;
  closeLabel: string;
  onClose: () => void;
  onAnimationEnd: (event: AnimationEvent<HTMLDivElement>) => void;
};

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating mobile navigation dropdown matching the Grill.am interaction pattern. */
export function MobileHeaderDropdown({
  pathname,
  exiting,
  aboutLabel,
  contactLabel,
  policiesLabel,
  closeLabel,
  onClose,
  onAnimationEnd,
}: MobileHeaderDropdownProps) {
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) {
      return;
    }

    const updatePosition = () => {
      const toolbar = document.querySelector<HTMLElement>('[data-mobile-header-toolbar]');
      const headerBottom = Math.round(toolbar?.getBoundingClientRect().bottom ?? 0);
      const panelTop = headerBottom + DROPDOWN_HEADER_GAP_PX;
      backdrop.style.top = `${headerBottom}px`;
      panel.style.top = `${panelTop}px`;
      panel.style.maxHeight = `calc(100dvh - ${panelTop + DROPDOWN_VIEWPORT_GAP_PX}px)`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, []);

  const linkClassName = (href: string) =>
    `${MOBILE_HEADER_DROPDOWN_NAV_LINK_CLASS} ${
      isRouteActive(pathname, href) ? 'text-[#00a1ff]' : 'text-[#171717]'
    }`;

  return (
    <>
      <button
        ref={backdropRef}
        type="button"
        className={`pointer-events-auto fixed inset-x-0 bottom-0 ${MOBILE_HEADER_DROPDOWN_BACKDROP_CLASS} ${
          exiting
            ? MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS
            : MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS
        }`}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`${MOBILE_HEADER_DROPDOWN_PANEL_CLASS} ${
          exiting
            ? MOBILE_HEADER_DROPDOWN_PANEL_MOTION_OUT_CLASS
            : MOBILE_HEADER_DROPDOWN_PANEL_MOTION_IN_CLASS
        }`}
        onAnimationEnd={onAnimationEnd}
      >
        <nav className="flex max-h-[inherit] flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col py-3">
            <Link href="/about" prefetch onClick={onClose} className={linkClassName('/about')}>
              {aboutLabel}
            </Link>
            <Link href="/contact" prefetch onClick={onClose} className={linkClassName('/contact')}>
              {contactLabel}
            </Link>
            <Link href="/policies" prefetch onClick={onClose} className={linkClassName('/policies')}>
              {policiesLabel}
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
