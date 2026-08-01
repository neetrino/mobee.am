'use client';

import { useEffect, useState } from 'react';
import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { useTranslation } from '../../../../lib/i18n-client';

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface MessageDetailDialogProps {
  message: AdminContactMessage | null;
  onClose: () => void;
}

/**
 * Modal to read a full contact message (table cell shows truncated preview).
 */
export function MessageDetailDialog({ message, onClose }: MessageDetailDialogProps) {
  const { t } = useTranslation();
  const [displayMessage, setDisplayMessage] = useState<AdminContactMessage | null>(null);
  const isOpen = message !== null;

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
    }
  }, [message]);

  const closeLabel = t('admin.common.close');
  const formattedDate = displayMessage
    ? new Date(displayMessage.createdAt).toLocaleString()
    : '';

  return (
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeAriaLabel={closeLabel}
      labelledBy="admin-message-detail-title"
      dialogFrameClassName="fixed left-1/2 top-1/2 z-10 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4 sm:px-6"
      panelClassName="flex max-h-[min(85dvh,720px)] w-full flex-col overflow-hidden rounded-[20px] border border-admin-100 bg-white shadow-2xl"
    >
      {({ requestClose }) => {
        if (!displayMessage) {
          return null;
        }

        return (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-100 px-4 py-3 sm:px-5">
              <h2
                id="admin-message-detail-title"
                className="min-w-0 truncate text-lg font-semibold text-gray-900"
              >
                {t('admin.messages.fullMessageTitle')}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-admin-50 hover:text-admin-700 focus:outline-none focus:ring-2 focus:ring-admin-400"
                aria-label={closeLabel}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-gray-500">{t('admin.messages.name')}</dt>
                  <dd className="mt-0.5 text-gray-900">{displayMessage.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">{t('admin.messages.email')}</dt>
                  <dd className="mt-0.5 break-all text-gray-900">{displayMessage.email}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-gray-500">{t('admin.messages.subject')}</dt>
                  <dd className="mt-0.5 text-gray-900">{displayMessage.subject}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-gray-500">{t('admin.messages.date')}</dt>
                  <dd className="mt-0.5 text-gray-900">{formattedDate}</dd>
                </div>
              </dl>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('admin.messages.message')}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
                  {displayMessage.message}
                </p>
              </div>
            </div>
          </>
        );
      }}
    </AnimatedModalPortal>
  );
}
