'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { buildCategoryTree } from '../utils';
import { CategoryItem } from './CategoryItem';
import { CategoriesPagination } from './CategoriesPagination';
import type { Category, CategoryWithLevel } from '../types';

interface CategoriesListProps {
  categories: Category[];
  searchQuery: string;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string, categoryTitle: string) => void;
}

const ITEMS_PER_PAGE = 20;

export function CategoriesList({
  categories,
  searchQuery,
  onEdit,
  onDelete,
}: CategoriesListProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return categoryTree;
    }
    return categoryTree.filter(
      (c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [categoryTree, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTree.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCategories = filteredTree.slice(startIndex, endIndex);

  // Reset to page 1 when data or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length, searchQuery]);

  if (categoryTree.length === 0) {
    return <p className="text-sm text-gray-500 py-2">{t('admin.categories.noCategories')}</p>;
  }

  return (
    <>
      {filteredTree.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">{t('admin.categories.noSearchResults')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedCategories.map((category: CategoryWithLevel) => {
              const parentCategory = category.parentId
                ? categories.find((c) => c.id === category.parentId)
                : null;

              return (
                <CategoryItem
                  key={category.id}
                  category={category}
                  parentCategory={parentCategory || null}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })}
          </div>

          <CategoriesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTree.length}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </>
  );
}




