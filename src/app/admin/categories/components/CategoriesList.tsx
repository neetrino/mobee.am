'use client';

import { createPortal } from 'react-dom';
import { useMemo } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { buildCategoryTree, getSubcategoryTitles } from '../utils';
import { useCategoryListDrag, type CategoryReorderPayload } from '../hooks/useCategoryListDrag';
import { CategoryDragGhost } from './CategoryDragGhost';
import { CategoryItem } from './CategoryItem';
import type { Category, CategoryWithLevel } from '../types';

interface CategoriesListProps {
  categories: Category[];
  searchQuery: string;
  reordering: boolean;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string, categoryTitle: string) => void;
  onReorder: (payload: CategoryReorderPayload) => Promise<void>;
}

export function CategoriesList({
  categories,
  searchQuery,
  reordering,
  onEdit,
  onDelete,
  onReorder,
}: CategoriesListProps) {
  const { t } = useTranslation();
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const reorderEnabled = searchQuery.trim().length === 0 && !reordering;

  const filteredTree = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return categoryTree;
    }
    return categoryTree.filter(
      (category) =>
        category.title.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query),
    );
  }, [categoryTree, searchQuery]);

  const { displayItems, draggingId, dragGhost, ghostElementRef, placeholderHeight, startDrag } =
    useCategoryListDrag({
      items: filteredTree,
      reorderEnabled,
      onReorder,
    });

  const draggingCategory = useMemo(
    () => displayItems.find((category) => category.id === draggingId) ?? null,
    [displayItems, draggingId],
  );

  if (categoryTree.length === 0) {
    return <p className="text-sm text-gray-500 py-2">{t('admin.categories.noCategories')}</p>;
  }

  if (filteredTree.length === 0) {
    return <p className="text-sm text-gray-500 py-2">{t('admin.categories.noSearchResults')}</p>;
  }

  return (
    <div className="relative overflow-x-auto rounded-supersudo border border-gray-200">
      <table className="min-w-full table-fixed divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-3 py-3" aria-hidden="true" />
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t('admin.categories.tableImage')}
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t('admin.categories.tableName')}
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              {t('admin.categories.tableSubcategory')}
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              {t('admin.categories.tableActions')}
            </th>
          </tr>
        </thead>
        <tbody className={draggingId ? 'select-none' : undefined}>
          {displayItems.map((category: CategoryWithLevel) => (
            <CategoryItem
              key={category.id}
              category={category}
              subcategoryLabel={getSubcategoryTitles(category.id, categories)}
              reorderEnabled={reorderEnabled}
              isDragging={draggingId === category.id}
              placeholderHeight={placeholderHeight}
              onEdit={onEdit}
              onDelete={onDelete}
              onHandlePointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                startDrag(category.id, event);
              }}
            />
          ))}
        </tbody>
      </table>

      {draggingCategory && dragGhost
        ? createPortal(
            <CategoryDragGhost
              category={draggingCategory}
              subcategoryLabel={getSubcategoryTitles(draggingCategory.id, categories)}
              rect={dragGhost}
              ghostRef={ghostElementRef}
            />,
            document.body,
          )
        : null}

      {!reorderEnabled && searchQuery.trim().length > 0 ? (
        <p className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          {t('admin.categories.reorderDisabledWhileSearching')}
        </p>
      ) : null}
    </div>
  );
}
