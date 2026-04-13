'use client';

import { Button } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import type { Category, CategoryWithLevel } from '../types';

interface CategoryItemProps {
  category: CategoryWithLevel;
  parentCategory: Category | null;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string, categoryTitle: string) => void;
}

export function CategoryItem({ category, parentCategory, onEdit, onDelete }: CategoryItemProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      style={{ paddingLeft: `${16 + category.level * 24}px` }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-900">{category.title}</div>
          {category.requiresSizes && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Sizes
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {category.slug}
          {parentCategory && (
            <span className="ml-2 text-gray-400">
              → Parent: {parentCategory.title}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(category)}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('admin.common.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(category.id, category.title)}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {t('admin.common.delete')}
        </Button>
      </div>
    </div>
  );
}




