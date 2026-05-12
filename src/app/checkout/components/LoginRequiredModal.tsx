'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';

const LOGIN_CTA_BACKGROUND = '#2DB2FF';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const { t } = useTranslation();
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  const handleGoToLogin = () => {
    onClose();
    router.push('/login?redirect=/checkout');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="login-required-title" className="text-xl font-semibold text-gray-900 pr-2">
            {t('checkout.modals.loginRequiredTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:text-admin-600"
            aria-label={t('checkout.modals.closeModal')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="text-gray-700 mb-6">{t('checkout.modals.loginRequiredMessage')}</p>
        <button
          type="button"
          onClick={handleGoToLogin}
          className="w-full rounded-full py-3 px-4 font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400"
          style={{ backgroundColor: LOGIN_CTA_BACKGROUND }}
        >
          {t('checkout.modals.goToLogin')}
        </button>
      </div>
    </div>
  );
}
