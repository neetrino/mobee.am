'use client';

import { useEffect, useState } from 'react';
import { AdminSideSheet } from '../../components/AdminSideSheet';
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
 * Side sheet to read a full contact message.
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
    <AdminSideSheet
      open={isOpen}
      onClose={onClose}
      title={t('admin.messages.fullMessageTitle')}
      closeLabel={closeLabel}
      desktopWidthClassName="lg:w-[42%]"
    >
      {displayMessage ? (
            <div className="space-y-4">
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
      ) : null}
    </AdminSideSheet>
  );
}
