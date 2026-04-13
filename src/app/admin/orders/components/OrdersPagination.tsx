'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Button } from '@shop/ui';

interface OrdersPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export function OrdersPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: OrdersPaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-gray-700">
        {t('admin.orders.showingPage')
          .replace('{page}', page.toString())
          .replace('{totalPages}', totalPages.toString())
          .replace('{total}', total.toString())}
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          {t('admin.orders.previous')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          {t('admin.orders.next')}
        </Button>
      </div>
    </div>
  );
}

