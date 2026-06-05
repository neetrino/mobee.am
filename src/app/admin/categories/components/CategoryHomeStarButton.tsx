'use client';

import { useState } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';

interface CategoryHomeStarButtonProps {
  isOnHome: boolean;
  homeStripPosition: number | null;
  disabled?: boolean;
  onToggle: () => Promise<void>;
}

export function CategoryHomeStarButton({
  isOnHome,
  homeStripPosition,
  disabled = false,
  onToggle,
}: CategoryHomeStarButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) {
      return;
    }

    try {
      setLoading(true);
      await onToggle();
    } finally {
      setLoading(false);
    }
  };

  const title = isOnHome
    ? t('admin.categories.homeStarRemove').replace(
        '{position}',
        String(homeStripPosition ?? ''),
      )
    : t('admin.categories.homeStarAdd');

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      onClick={() => void handleClick()}
      className={`inline-flex size-8 items-center justify-center rounded-supersudo transition-colors ${
        isOnHome
          ? 'text-amber-500 hover:bg-amber-50'
          : 'text-gray-300 hover:bg-gray-100 hover:text-amber-400'
      } ${loading ? 'opacity-60' : ''}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill={isOnHome ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={isOnHome ? 0 : 1.8}
        aria-hidden
      >
        <path d="M12 2.5l2.86 5.8 6.4.93-4.63 4.52 1.09 6.37L12 17.77 6.28 20.12l1.09-6.37L2.74 9.23l6.4-.93L12 2.5z" />
      </svg>
    </button>
  );
}
