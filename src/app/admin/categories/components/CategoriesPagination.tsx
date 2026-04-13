'use client';

import { Button } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';

interface CategoriesPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function CategoriesPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: CategoriesPaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
      <div className="text-sm text-gray-700">
        {t('admin.categories.showingPage')
          .replace('{page}', currentPage.toString())
          .replace('{totalPages}', totalPages.toString())
          .replace('{total}', totalItems.toString())}
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {t('admin.categories.previous')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          {t('admin.categories.next')}
        </Button>
      </div>
    </div>
  );
}




