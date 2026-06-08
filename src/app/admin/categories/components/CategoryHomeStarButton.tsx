'use client';

import { Star } from 'lucide-react';
import { useTranslation } from '../../../../lib/i18n-client';

interface CategoryHomeStarButtonProps {
  showOnHomePage: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function CategoryHomeStarButton({
  showOnHomePage,
  disabled = false,
  onToggle,
}: CategoryHomeStarButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={showOnHomePage}
      aria-label={
        showOnHomePage
          ? t('admin.categories.homeStarRemove')
          : t('admin.categories.homeStarAdd')
      }
      title={
        showOnHomePage
          ? t('admin.categories.homeStarRemove')
          : t('admin.categories.homeStarAdd')
      }
      className={`inline-flex size-9 items-center justify-center rounded-supersudo transition-colors ${
        showOnHomePage
          ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
          : 'border border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
      } disabled:cursor-default disabled:opacity-50`}
    >
      <Star
        className="size-4"
        aria-hidden="true"
        fill={showOnHomePage ? 'currentColor' : 'none'}
      />
    </button>
  );
}
