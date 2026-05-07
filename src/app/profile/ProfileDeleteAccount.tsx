'use client';

import { useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth/AuthContext';
import { DELETE_ACCOUNT_CONFIRM_PHRASE } from './profile-delete-account.constants';

interface ProfileDeleteAccountProps {
  t: (key: string) => string;
  /** `sidebar`: left nav row · `grid`: mobile 2-col tile (destructive). */
  variant?: 'sidebar' | 'grid';
}

/**
 * Destructive account deletion (soft-delete on server). Clears local session after success.
 */
export function ProfileDeleteAccount({ t, variant = 'sidebar' }: ProfileDeleteAccountProps) {
  const { logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    setConfirmStep(1);
    setTypedPhrase('');
    setLocalError(null);
  }, [modalOpen]);

  const phraseMatches = typedPhrase.trim() === DELETE_ACCOUNT_CONFIRM_PHRASE;

  const openModal = () => setModalOpen(true);

  const closeModal = () => {
    if (deleting) return;
    setModalOpen(false);
  };

  const handleFinalDelete = async () => {
    if (!phraseMatches) {
      setLocalError(t('profile.deleteAccount.phraseMismatch'));
      return;
    }
    setLocalError(null);
    setDeleting(true);
    try {
      await apiClient.delete<{ success: boolean }>('/api/v1/users/profile');
      setModalOpen(false);
      logout();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('profile.deleteAccount.failed');
      setLocalError(message);
    } finally {
      setDeleting(false);
    }
  };

  const sidebarButtonClass =
    'mt-2 flex w-full items-center gap-3 rounded-full border border-red-200 bg-white px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50';

  const gridButtonClass =
    'flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-[#FFDADA] bg-white px-3 py-4 text-center text-xs font-medium text-[#C0392B] transition-colors hover:bg-red-50 sm:text-sm';

  const buttonClass = variant === 'grid' ? gridButtonClass : sidebarButtonClass;

  return (
    <>
      <button type="button" onClick={openModal} className={buttonClass}>
        {variant === 'grid' ? (
          <>
            <svg
              className="h-7 w-7 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="line-clamp-2 leading-tight">{t('profile.deleteAccount.button')}</span>
          </>
        ) : (
          <>
            <span className="flex-shrink-0 text-red-500" aria-hidden>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </span>
            <span>{t('profile.deleteAccount.button')}</span>
          </>
        )}
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="max-w-md rounded-[15px] border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmStep === 1 ? (
              <>
                <h2 id="delete-account-title" className="text-lg font-semibold text-gray-900">
                  {t('profile.deleteAccount.confirmTitle')}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{t('profile.deleteAccount.confirmBody')}</p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={closeModal}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('profile.deleteAccount.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmStep(2)}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {t('profile.deleteAccount.continueToConfirm')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="delete-account-title" className="text-lg font-semibold text-gray-900">
                  {t('profile.deleteAccount.finalTitle')}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{t('profile.deleteAccount.finalBody')}</p>
                <label htmlFor="delete-account-phrase" className="mt-4 block text-sm font-medium text-gray-700">
                  {t('profile.deleteAccount.typeLabel')}
                </label>
                <input
                  id="delete-account-phrase"
                  type="text"
                  autoComplete="off"
                  value={typedPhrase}
                  onChange={(e) => {
                    setTypedPhrase(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder={DELETE_ACCOUNT_CONFIRM_PHRASE}
                  disabled={deleting}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-50"
                />
                {localError && (
                  <p className="mt-3 text-sm text-red-600" role="alert">
                    {localError}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setConfirmStep(1);
                      setTypedPhrase('');
                      setLocalError(null);
                    }}
                    className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                  >
                    {t('profile.deleteAccount.back')}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={closeModal}
                      className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {t('profile.deleteAccount.cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={deleting || !phraseMatches}
                      onClick={() => void handleFinalDelete()}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? t('profile.deleteAccount.deleting') : t('profile.deleteAccount.confirm')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
