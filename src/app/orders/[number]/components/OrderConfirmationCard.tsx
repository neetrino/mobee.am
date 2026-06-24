'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../../lib/i18n-client';
import {
  getLoginRedirectToProfileOrdersPath,
  getProfileOrdersPath,
} from '../../../profile/profile-orders-path';
import {
  ORDER_CONFIRMATION_CARD_CLASS,
  ORDER_CONFIRMATION_SHELL_CLASS,
  ORDER_CONFIRMATION_SUCCESS_ICON_CLASS,
  ORDER_CONTINUE_SHOPPING_OUTLINE_BUTTON_CLASS,
  ORDER_VIEW_DETAILS_BUTTON_CLASS,
} from '../constants';

interface OrderConfirmationCardProps {
  orderNumber: string;
  isLoggedIn: boolean;
}

export function OrderConfirmationCard({ orderNumber, isLoggedIn }: OrderConfirmationCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleViewOrderDetails = () => {
    router.push(isLoggedIn ? getProfileOrdersPath() : getLoginRedirectToProfileOrdersPath());
  };

  return (
    <div className={ORDER_CONFIRMATION_SHELL_CLASS}>
      <div className={ORDER_CONFIRMATION_CARD_CLASS}>
        <div className="flex flex-col items-center text-center">
          <div className={ORDER_CONFIRMATION_SUCCESS_ICON_CLASS} aria-hidden="true">
            <svg
              className="size-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            {t('orders.placedSuccess.title')}
          </h1>

          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">
            {t('orders.placedSuccess.description').replace('{number}', orderNumber)}
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleViewOrderDetails} className={ORDER_VIEW_DETAILS_BUTTON_CLASS}>
              {t('orders.placedSuccess.viewOrderDetails')}
            </button>
            <Link href="/products" className={ORDER_CONTINUE_SHOPPING_OUTLINE_BUTTON_CLASS}>
              {t('orders.buttons.continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
