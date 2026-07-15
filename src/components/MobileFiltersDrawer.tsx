'use client';

import {
  useState,
  useEffect,
  useCallback,
  type AnimationEvent,
  type ReactNode,
} from 'react';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';
import { useTranslation } from '../lib/i18n-client';
import {
  MOBILE_DRAWER_SHELL_BACKDROP_CLASS,
  MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS,
  MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS,
  MOBILE_DRAWER_SHELL_PANEL_MOTION_IN_CLASS,
  MOBILE_DRAWER_SHELL_PANEL_MOTION_OUT_CLASS,
  MOBILE_DRAWER_SHELL_ROOT_CLASS,
  MOBILE_DRAWER_SHELL_TRANSITION_MS,
} from './mobile-drawer-nav.constants';

/** Slightly wider than the main mobile menu, with right-side rounded corners. */
const MOBILE_FILTERS_DRAWER_PANEL_CLASS =
  'relative z-10 flex h-full min-h-dvh min-w-[18rem] w-[min(88vw,26rem)] max-w-full flex-col overflow-hidden rounded-tr-[28px] rounded-br-[28px] bg-white shadow-2xl';

interface MobileFiltersDrawerProps {
  title?: string;
  triggerLabel?: string;
  children?: ReactNode;
  /** Lazy panel factory — invoked only while the drawer is open. */
  renderWhenOpen?: () => ReactNode;
  openEventName?: string;
}

/**
 * Mobile filters drawer — same open/close motion as the Header mobile menu.
 */
export function MobileFiltersDrawer({
  title,
  triggerLabel: _triggerLabel,
  children,
  renderWhenOpen,
  openEventName,
}: MobileFiltersDrawerProps) {
  const { t } = useTranslation();
  const defaultTitle = title || t('products.mobileFilters.title');
  const [open, setOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const isVisible = open || isExiting;

  const requestClose = useCallback(() => {
    if (isExiting || !open) {
      return;
    }
    setIsExiting(true);
    setOpen(false);
  }, [isExiting, open]);

  const openDrawer = useCallback(() => {
    if (isExiting) {
      return;
    }
    setIsExiting(false);
    setOpen(true);
  }, [isExiting]);

  const handlePanelAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.animationName.includes('mobile-drawer-panel-out')) {
      setIsExiting(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setIsExiting(false);
    }
  }, [open]);

  useEffect(() => {
    if (open || !isExiting) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setIsExiting(false);
    }, MOBILE_DRAWER_SHELL_TRANSITION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, isExiting]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    return acquireBodyScrollLock();
  }, [isVisible]);

  useEffect(() => {
    if (!openEventName) {
      return;
    }

    const handleExternalToggle = () => {
      if (open || isExiting) {
        requestClose();
        return;
      }
      openDrawer();
    };

    window.addEventListener(openEventName, handleExternalToggle);
    return () => {
      window.removeEventListener(openEventName, handleExternalToggle);
    };
  }, [openEventName, open, isExiting, openDrawer, requestClose]);

  return (
    <div className="lg:hidden">
      {isVisible ? (
        <div className={MOBILE_DRAWER_SHELL_ROOT_CLASS} role="dialog" aria-modal="true">
          <button
            type="button"
            className={`${MOBILE_DRAWER_SHELL_BACKDROP_CLASS} ${
              isExiting
                ? MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS
                : MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS
            }`}
            aria-label={t('products.mobileFilters.close')}
            onClick={requestClose}
          />
          <div
            className={`${MOBILE_FILTERS_DRAWER_PANEL_CLASS} ${
              isExiting
                ? MOBILE_DRAWER_SHELL_PANEL_MOTION_OUT_CLASS
                : MOBILE_DRAWER_SHELL_PANEL_MOTION_IN_CLASS
            }`}
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={handlePanelAnimationEnd}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
              <p className="text-xl font-bold text-gray-900">{defaultTitle}</p>
              <button
                type="button"
                onClick={requestClose}
                className="h-10 w-10 rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-admin-300 hover:bg-admin-50 hover:text-admin-600"
                aria-label={t('products.mobileFilters.close')}
              >
                <svg className="mx-auto h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-6 pb-10 [-webkit-overflow-scrolling:touch]">
              {renderWhenOpen ? renderWhenOpen() : children}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
