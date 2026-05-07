'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';
import type { CheckoutFormData } from '../types';

interface CheckoutLegalAcknowledgementsProps {
  register: UseFormRegister<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  shippingMethod: 'pickup' | 'delivery';
  isSubmitting: boolean;
}

export function CheckoutLegalAcknowledgements({
  register,
  errors,
  shippingMethod,
  isSubmitting,
}: CheckoutLegalAcknowledgementsProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6" data-legal-acknowledgements>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('checkout.legal.sectionTitle')}</h2>
      <div className="space-y-4">
        {shippingMethod === 'delivery' && (
          <>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                disabled={isSubmitting}
                {...register('acceptDeliverySupplyTerms')}
              />
              <span className="text-sm text-gray-700">{t('checkout.legal.deliverySupplyTerms')}</span>
            </label>
            {errors.acceptDeliverySupplyTerms?.message && (
              <p className="text-sm text-red-600 -mt-2 ml-7">{errors.acceptDeliverySupplyTerms.message}</p>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                disabled={isSubmitting}
                {...register('acceptInspectionAtDelivery')}
              />
              <span className="text-sm text-gray-700">{t('checkout.legal.inspectionAtDelivery')}</span>
            </label>
            {errors.acceptInspectionAtDelivery?.message && (
              <p className="text-sm text-red-600 -mt-2 ml-7">{errors.acceptInspectionAtDelivery.message}</p>
            )}
          </>
        )}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            disabled={isSubmitting}
            {...register('acceptOrderVerification')}
          />
          <span className="text-sm text-gray-700">{t('checkout.legal.orderVerification')}</span>
        </label>
        {errors.acceptOrderVerification?.message && (
          <p className="text-sm text-red-600 -mt-2 ml-7">{errors.acceptOrderVerification.message}</p>
        )}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            disabled={isSubmitting}
            {...register('acceptReturnsPolicy')}
          />
          <span className="text-sm text-gray-700">{t('checkout.legal.returnsPolicy')}</span>
        </label>
        {errors.acceptReturnsPolicy?.message && (
          <p className="text-sm text-red-600 -mt-2 ml-7">{errors.acceptReturnsPolicy.message}</p>
        )}
      </div>
    </Card>
  );
}
