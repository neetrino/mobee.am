'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';
import { useTranslation } from '../lib/i18n-client';

interface MobileFiltersDrawerProps {
  title?: string;
  triggerLabel?: string;
  children: ReactNode;
  openEventName?: string;
}

/**
 * Mobile filters drawer that կարող է բացվել թե՛ կոճակից, թե՛ արտաքին իրադարձությունից։
 */
export function MobileFiltersDrawer({
  title,
  triggerLabel: _triggerLabel,
  children,
  openEventName,
}: MobileFiltersDrawerProps) {
  const { t } = useTranslation();
  const defaultTitle = title || t('products.mobileFilters.title');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  useEffect(() => {
    if (!openEventName) return;

    const handleExternalToggle = () => {
      console.debug('[MobileFiltersDrawer] external toggle received');
      setOpen((prev) => !prev);
    };

    window.addEventListener(openEventName, handleExternalToggle);
    return () => {
      window.removeEventListener(openEventName, handleExternalToggle);
    };
  }, [openEventName]);

  return (
    <div className="lg:hidden">
      {open && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-full min-h-screen w-1/2 min-w-[16rem] max-w-full bg-white flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <p className="text-lg font-semibold text-gray-900">{defaultTitle}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-admin-300 hover:bg-admin-50 hover:text-admin-600"
                aria-label={t('products.mobileFilters.close')}
              >
                <svg className="mx-auto h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

