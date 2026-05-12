'use client';

import { useEffect, type ReactNode } from 'react';
import { acquireBodyScrollLock } from '../../lib/body-scroll-lock';

interface ProfileSectionModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  /** When false, body scroll is not locked (e.g. desktop uses inline panel). */
  lockBodyScroll?: boolean;
}

/**
 * Full-screen style sheet on small viewports, centered panel on `sm+`.
 */
export function ProfileSectionModal({
  open,
  title,
  onClose,
  closeLabel,
  children,
  lockBodyScroll = true,
}: ProfileSectionModalProps) {
  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    return acquireBodyScrollLock();
  }, [open, lockBodyScroll]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col justify-end sm:justify-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-section-title"
        className="relative z-10 flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-t-[20px] border border-admin-100 bg-white shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-[20px]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-100 px-4 py-3 sm:px-5">
          <h2 id="profile-section-title" className="min-w-0 truncate text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-admin-50 hover:text-admin-700 focus:outline-none focus:ring-2 focus:ring-admin-400"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
