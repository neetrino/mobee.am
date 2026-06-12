'use client';

import { Card } from '@shop/ui';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import type { CheckoutFormData } from '../types';
import {
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_OPTION_SELECTED_CHROME_CLASS,
  CHECKOUT_RADIO_ACCENT_CLASS,
} from '../constants';

const CHECKOUT_FORM_SECTION_CARD_CLASS = `p-6 ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS}`;

interface PurchaseIntentSectionProps {
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  purchaseIntent: 'buy_now' | 'aparik';
  isSubmitting: boolean;
}

export function PurchaseIntentSection({
  register,
  setValue,
  purchaseIntent,
  isSubmitting,
}: PurchaseIntentSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS} data-purchase-intent-section>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.purchaseIntent.title')}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label
          className={`flex min-w-0 cursor-pointer items-center border-2 p-4 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
            purchaseIntent === 'buy_now'
              ? CHECKOUT_OPTION_SELECTED_CHROME_CLASS
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            {...register('purchaseIntent')}
            value="buy_now"
            checked={purchaseIntent === 'buy_now'}
            onChange={(e) =>
              setValue('purchaseIntent', e.target.value as 'buy_now' | 'aparik', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className={`mr-3 shrink-0 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
            disabled={isSubmitting}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">{t('checkout.purchaseIntent.buyNow')}</div>
            <div className="text-sm text-gray-600 leading-snug">{t('checkout.purchaseIntent.buyNowDescription')}</div>
          </div>
        </label>

        <label
          className={`flex min-w-0 cursor-pointer items-center border-2 p-4 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
            purchaseIntent === 'aparik'
              ? CHECKOUT_OPTION_SELECTED_CHROME_CLASS
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            {...register('purchaseIntent')}
            value="aparik"
            checked={purchaseIntent === 'aparik'}
            onChange={(e) =>
              setValue('purchaseIntent', e.target.value as 'buy_now' | 'aparik', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className={`mr-3 shrink-0 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
            disabled={isSubmitting}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">{t('checkout.purchaseIntent.aparik')}</div>
            <div className="text-sm text-gray-600 leading-snug">{t('checkout.purchaseIntent.aparikDescription')}</div>
          </div>
        </label>
      </div>
    </Card>
  );
}
