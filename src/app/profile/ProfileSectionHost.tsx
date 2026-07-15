'use client';

import type { ComponentProps, ReactNode } from 'react';
import { ProfileSectionModal } from './ProfileSectionModal';
import { ProfileSheetBody } from './ProfileSheetBody';

type ProfileSheetBodyProps = ComponentProps<typeof ProfileSheetBody>;

export type ProfileSectionHostProps = ProfileSheetBodyProps & {
  profileSheetOpen: boolean;
  isDesktopLayout: boolean;
  modalTitle: string;
  onCloseSheet: () => void;
  closeLabel: string;
  error?: string | null;
  success?: string | null;
};

function ProfileAlerts({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}): ReactNode {
  if (!error && !success) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3">
      {error ? (
        <div className="rounded-[15px] border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[15px] border border-green-200 bg-green-50 p-4" role="status">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Desktop: section inline under the profile header. Mobile: {@link ProfileSectionModal}.
 */
export function ProfileSectionHost({
  profileSheetOpen,
  isDesktopLayout,
  modalTitle,
  onCloseSheet,
  closeLabel,
  error,
  success,
  ...sheetBodyProps
}: ProfileSectionHostProps) {
  const body = (
    <>
      <ProfileAlerts error={error} success={success} />
      <ProfileSheetBody {...sheetBodyProps} />
    </>
  );

  if (isDesktopLayout) {
    if (!profileSheetOpen) {
      return null;
    }

    return (
      <section
        className="overflow-hidden rounded-[20px] border border-admin-100 bg-white shadow-sm"
        aria-labelledby="profile-desktop-section-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-admin-100 px-4 py-3 sm:px-5">
          <h2
            id="profile-desktop-section-title"
            className="min-w-0 truncate text-lg font-semibold text-gray-900"
          >
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onCloseSheet}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-admin-50 hover:text-admin-700 focus:outline-none focus:ring-2 focus:ring-admin-400"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-4 sm:px-5 sm:py-5">{body}</div>
      </section>
    );
  }

  return (
    <ProfileSectionModal
      open={profileSheetOpen}
      title={modalTitle}
      onClose={onCloseSheet}
      closeLabel={closeLabel}
      lockBodyScroll
    >
      {body}
    </ProfileSectionModal>
  );
}
