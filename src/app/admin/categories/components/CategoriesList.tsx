'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { buildCategoryTree } from '../utils';
import { CategoryItem } from './CategoryItem';
import { CategoriesPagination } from './CategoriesPagination';
import type { Category, CategoryWithLevel } from '../types';

interface CategoriesListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string, categoryTitle: string) => void;
}

const ITEMS_PER_PAGE = 20;

export function CategoriesList({ categories, onEdit, onDelete }: CategoriesListProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const categoryTree = buildCategoryTree(categories);

  // Pagination calculations
  const totalPages = Math.ceil(categoryTree.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCategories = categoryTree.slice(startIndex, endIndex);

  // Reset to page 1 when categories change
  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length]);

  if (categoryTree.length === 0) {
    return <p className="text-sm text-gray-500 py-2">{t('admin.categories.noCategories')}</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {paginatedCategories.map((category: CategoryWithLevel) => {
          const parentCategory = category.parentId 
            ? categories.find(c => c.id === category.parentId)
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
        totalItems={categoryTree.length}
        onPageChange={setCurrentPage}
      />
    </>
  );
}




