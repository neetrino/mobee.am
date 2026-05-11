'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';
import {
  MOBILE_PRIMARY_MENU_BAR_CLASS,
  MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS,
  MOBILE_PRIMARY_MENU_OPEN_BUTTON_WITH_LABEL_CLASS,
} from './header-strip-layout';
import { MOBILE_DRAWER_SHELL_PANEL_CLASS } from './mobile-drawer-nav.constants';
import { SiteBrandLogo } from './SiteBrandLogo';

export interface AdminMenuItem {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
  isSubCategory?: boolean;
}

interface AdminMenuDrawerProps {
  /** Receives a callback to run after in-drawer navigation (closes the drawer). */
  renderNav: (onAfterNavigate: () => void) => ReactNode;
  /** Target when the drawer header logo is clicked (e.g. storefront home). */
  logoHref: string;
  logoLinkAria: string;
  siteLogoAlt: string;
  /** Accessible name for the open drawer surface. */
  drawerTitle: string;
  /** Visible label next to the burger (e.g. “Menu”); also used as the control’s accessible name. */
  drawerMenuButton: string;
  closeMenuAria: string;
}

/**
 * Mobile admin navigation: same shell as storefront Header mobile menu (panel width, header, pills).
 */
export function AdminMenuDrawer({
  renderNav,
  logoHref,
  logoLinkAria,
  siteLogoAlt,
  drawerTitle,
  drawerMenuButton,
  closeMenuAria,
}: AdminMenuDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className={MOBILE_PRIMARY_MENU_OPEN_BUTTON_WITH_LABEL_CLASS}
      >
        <span className={MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS} aria-hidden>
          <span className={MOBILE_PRIMARY_MENU_BAR_CLASS} />
          <span className={MOBILE_PRIMARY_MENU_BAR_CLASS} />
          <span className={MOBILE_PRIMARY_MENU_BAR_CLASS} />
        </span>
        <span className="text-base font-bold leading-tight text-gray-900">{drawerMenuButton}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex bg-black/40"
          onClick={() => {
            setOpen(false);
          }}
        >
          <div
            className={MOBILE_DRAWER_SHELL_PANEL_CLASS}
            role="dialog"
            aria-modal="true"
            aria-label={drawerTitle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Link
                  href={logoHref}
                  onClick={() => {
                    setOpen(false);
                  }}
                  aria-label={logoLinkAria}
                  className="flex min-w-0 max-w-[min(200px,55%)] shrink-0 items-center rounded-xl transition-opacity active:opacity-90"
                >
                  <SiteBrandLogo decorative alt={siteLogoAlt} heightClass="h-8" />
                </Link>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-pretty text-base font-semibold text-gray-900">{drawerTitle}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-admin-300 hover:bg-admin-50 hover:text-admin-600"
                  aria-label={closeMenuAria}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <nav className="flex h-full min-h-0 flex-col">
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
                  {renderNav(() => {
                    setOpen(false);
                  })}
                </div>
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
