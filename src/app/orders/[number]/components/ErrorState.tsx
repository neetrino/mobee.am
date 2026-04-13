'use client';

import Link from 'next/link';
import { Card, Button } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';

interface ErrorStateProps {
  error: string | null;
}

export function ErrorState({ error }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('orders.notFound.title')}</h1>
        <p className="text-gray-600 mb-6">{error || t('orders.notFound.description')}</p>
        <Link href="/products">
          <Button variant="primary">{t('orders.buttons.continueShopping')}</Button>
        </Link>
      </Card>
    </div>
  );
}




