'use client';

import Image from 'next/image';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../../lib/i18n-client';
import type { CategoryWithLevel } from '../types';
import { CategoryDragHandle } from './CategoryDragHandle';

interface CategoryTableRowCellsProps {
  category: CategoryWithLevel;
  subcategoryLabel: string;
  reorderEnabled: boolean;
  isHandleActive: boolean;
  onEdit?: (category: CategoryWithLevel) => void;
  onDelete?: (categoryId: string, categoryTitle: string) => void;
  onHandlePointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const LEVEL_PADDING_CLASSES = ['pl-4', 'pl-8', 'pl-12', 'pl-16'] as const;

function getLevelPaddingClass(level: number): string {
  return LEVEL_PADDING_CLASSES[Math.min(level, LEVEL_PADDING_CLASSES.length - 1)];
}

export function CategoryTableRowCells({
  category,
  subcategoryLabel,
  reorderEnabled,
  isHandleActive,
  onEdit,
  onDelete,
  onHandlePointerDown,
}: CategoryTableRowCellsProps) {
  const { t } = useTranslation();
  const isInteractive = Boolean(onEdit && onDelete && onHandlePointerDown);

  return (
    <>
      <td className="w-12 px-3 py-3">
        <CategoryDragHandle
          isDragging={isHandleActive}
          disabled={!reorderEnabled || !isInteractive}
          label={t('admin.categories.dragHandle')}
          onPointerDown={onHandlePointerDown ?? (() => undefined)}
        />
      </td>
      <td className="w-16 px-3 py-3">
        <div className="relative size-10 overflow-hidden rounded-supersudo border border-gray-200 bg-white">
          {category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt=""
              fill
              sizes="40px"
              className="object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-gray-400">
              —
            </div>
          )}
        </div>
      </td>
      <td className={`min-w-0 px-3 py-3 ${getLevelPaddingClass(category.level)}`}>
        <div className="truncate text-sm font-semibold text-gray-900">{category.title}</div>
        <div className="mt-0.5 truncate text-xs text-gray-500">{category.slug}</div>
      </td>
      <td className="min-w-[140px] px-3 py-3 text-sm text-gray-600">
        {subcategoryLabel || '—'}
      </td>
      <td className="w-28 px-3 py-3">
        {isInteractive ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(category)}
              aria-label={t('admin.common.edit')}
              className="flex size-9 items-center justify-center rounded-supersudo border border-gray-200 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(category.id, category.title)}
              aria-label={t('admin.common.delete')}
              className="flex size-9 items-center justify-center rounded-supersudo text-red-500 transition-colors hover:bg-red-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 opacity-80">
            <div className="flex size-9 items-center justify-center rounded-supersudo border border-gray-200 bg-gray-100 text-gray-700">
              <Pencil className="size-4" aria-hidden="true" />
            </div>
            <div className="flex size-9 items-center justify-center rounded-supersudo text-red-500">
              <Trash2 className="size-4" aria-hidden="true" />
            </div>
          </div>
        )}
      </td>
    </>
  );
}
