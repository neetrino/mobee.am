'use client';

import { HOME_CATEGORY_STRIP_POSITIONS } from '@/lib/constants/home-category-strip.constants';
import { useTranslation } from '../../../../lib/i18n-client';
import type { Category } from '../types';
import {
  confirmHomeStripPositionTakeover,
  findHomeStripPositionConflict,
} from '../utils/homeStripPositionConflict';

interface HomeStripPositionSelectProps {
  value: number | null;
  categories: Category[];
  editingCategoryId?: string;
  onChange: (value: number | null) => void;
}

export function HomeStripPositionSelect({
  value,
  categories,
  editingCategoryId,
  onChange,
}: HomeStripPositionSelectProps) {
  const { t } = useTranslation();

  const handleChange = async (nextValue: number | null) => {
    if (nextValue !== null) {
      const conflict = findHomeStripPositionConflict(
        categories,
        nextValue,
        editingCategoryId,
      );

      if (conflict) {
        const confirmed = await confirmHomeStripPositionTakeover(
          t,
          nextValue,
          conflict.title,
        );
        if (!confirmed) {
          return;
        }
      }
    }

    onChange(nextValue);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('admin.categories.homeStripPosition')}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const next = e.target.value;
          void handleChange(next === '' ? null : Number.parseInt(next, 10));
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-supersudo focus:outline-none focus:ring-2 focus:ring-admin"
      >
        <option value="">{t('admin.categories.homeStripPositionNone')}</option>
        {HOME_CATEGORY_STRIP_POSITIONS.map((position) => {
          const conflict = findHomeStripPositionConflict(
            categories,
            position,
            editingCategoryId,
          );
          const slotLabel = t('admin.categories.homeStripPositionSlot').replace(
            '{position}',
            String(position),
          );
          const occupiedSuffix = conflict
            ? ` — ${t('admin.categories.homeStripPositionOccupied').replace('{name}', conflict.title)}`
            : '';

          return (
            <option key={position} value={position}>
              {slotLabel}
              {occupiedSuffix}
            </option>
          );
        })}
      </select>
      <p className="mt-1 text-xs text-gray-500">{t('admin.categories.homeStripPositionHint')}</p>
    </div>
  );
}
