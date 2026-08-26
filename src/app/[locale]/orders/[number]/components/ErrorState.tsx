'use client';

import { Link } from '@/lib/i18n/navigation';
import { useTranslation } from '../../../../../lib/i18n-client';
import {
  ORDER_CONTINUE_SHOPPING_BUTTON_CLASS,
  ORDER_PAGE_CARD_CLASS,
  ORDER_PAGE_SHELL_CLASS,
} from '../constants';

interface ErrorStateProps {
  error: string | null;
}

export function ErrorState({ error }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div className={ORDER_PAGE_SHELL_CLASS}>
      <section className={`${ORDER_PAGE_CARD_CLASS} text-center`}>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('orders.notFound.title')}</h1>
        <p className="mb-6 text-gray-600">{error || t('orders.notFound.description')}</p>
        <Link href="/products" className={`${ORDER_CONTINUE_SHOPPING_BUTTON_CLASS} inline-flex`}>
          {t('orders.buttons.continueShopping')}
        </Link>
      </section>
    </div>
  );
}




