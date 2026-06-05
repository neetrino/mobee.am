'use client';

import { HOME_CATEGORY_STRIP_POSITIONS } from '@/lib/constants/home-category-strip.constants';
import { useTranslation } from '../../../../lib/i18n-client';

interface HomeStripPositionSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function HomeStripPositionSelect({ value, onChange }: HomeStripPositionSelectProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('admin.categories.homeStripPosition')}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === '' ? null : Number.parseInt(next, 10));
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-supersudo focus:outline-none focus:ring-2 focus:ring-admin"
      >
        <option value="">{t('admin.categories.homeStripPositionNone')}</option>
        {HOME_CATEGORY_STRIP_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {t('admin.categories.homeStripPositionSlot').replace('{position}', String(position))}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">{t('admin.categories.homeStripPositionHint')}</p>
    </div>
  );
}
