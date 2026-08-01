'use client';

import { useRouter } from 'next/navigation';
import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { useTranslation } from '../../../lib/i18n-client';

const LOGIN_CTA_CLASS =
  'w-full rounded-full bg-[#2DB2FF] py-3 px-4 font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleGoToLogin = (requestClose: () => void) => {
    requestClose();
    router.push('/login?redirect=/checkout');
  };

  return (
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeAriaLabel={t('checkout.modals.closeModal')}
      labelledBy="login-required-title"
      panelClassName="w-full rounded-xl bg-white p-6 shadow-2xl"
    >
      {({ requestClose }) => (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 id="login-required-title" className="pr-2 text-xl font-semibold text-gray-900">
              {t('checkout.modals.loginRequiredTitle')}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:text-admin-600"
              aria-label={t('checkout.modals.closeModal')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="mb-6 text-gray-700">{t('checkout.modals.loginRequiredMessage')}</p>
          <button type="button" onClick={() => handleGoToLogin(requestClose)} className={LOGIN_CTA_CLASS}>
            {t('checkout.modals.goToLogin')}
          </button>
        </>
      )}
    </AnimatedModalPortal>
  );
}
