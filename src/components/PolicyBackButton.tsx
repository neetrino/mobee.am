'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslation } from '@/lib/i18n-client';

/** Shared back navigation for policy hub and policy detail pages. */
export function PolicyBackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-6 mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 md:mb-8 md:mt-0"
      aria-label={t('common.buttons.back')}
    >
      <ChevronLeft className="size-5" strokeWidth={2} aria-hidden />
      <span>{t('common.buttons.back')}</span>
    </button>
  );
}
