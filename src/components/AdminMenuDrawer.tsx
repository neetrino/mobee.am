'use client';

import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';
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
  drawerMenuButton: string;
  closeMenuAria: string;
}

/**
 * Mobile admin navigation shell: trigger opens a drawer whose body matches the desktop sidebar.
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
        aria-label={drawerMenuButton}
        className="inline-flex items-center gap-2 rounded-supersudo border border-gray-200 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-800 shadow-sm"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6H20M4 12H16M4 18H12" />
        </svg>
        {drawerMenuButton}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex bg-black/40"
          onClick={() => {
            setOpen(false);
          }}
        >
          <div
            className="h-full min-h-screen w-1/2 min-w-[16rem] max-w-full bg-white flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={drawerTitle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <Link
                href={logoHref}
                aria-label={logoLinkAria}
                onClick={() => {
                  setOpen(false);
                }}
                className="flex min-w-0 max-w-[min(220px,72%)] shrink-0 transition-opacity hover:opacity-90"
              >
                <SiteBrandLogo decorative alt={siteLogoAlt} heightClass="h-11" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                aria-label={closeMenuAria}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden strokeWidth={2} />
              </button>
            </div>

            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-supersudo border border-gray-200 bg-white p-2">
              {renderNav(() => {
                setOpen(false);
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
