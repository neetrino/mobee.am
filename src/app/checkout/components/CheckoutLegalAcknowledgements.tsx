'use client';

import { useId } from 'react';
import {
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import type { CheckoutFormData } from '../types';
import {
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_RADIO_ACCENT_CLASS,
} from '../constants';

const CHECKBOX_CLASS = `mt-0.5 h-5 w-5 min-h-[1.25rem] min-w-[1.25rem] shrink-0 rounded border-gray-300 ${CHECKOUT_RADIO_ACCENT_CLASS} focus:outline-none focus:ring-2 focus:ring-admin-500 focus:ring-offset-0`;
const TEXT_CLASS = 'text-sm leading-relaxed text-gray-700 min-w-0 flex-1';
const ROW_GAP = 'gap-3';

interface CheckoutLegalAcknowledgementsProps {
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  watch: UseFormWatch<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  shippingMethod: 'pickup' | 'delivery';
  isSubmitting: boolean;
}

export function CheckoutLegalAcknowledgements({
  register,
  setValue,
  watch,
  errors,
  shippingMethod,
  isSubmitting,
}: CheckoutLegalAcknowledgementsProps) {
  const { t } = useTranslation();
  const baseId = useId();

  const deliveryBundleChecked =
    watch('acceptDeliverySupplyTerms') && watch('acceptInspectionAtDelivery');
  const confirmBundleChecked =
    watch('acceptOrderVerification') && watch('acceptReturnsPolicy');

  const deliveryBundleError =
    errors.acceptDeliverySupplyTerms?.message || errors.acceptInspectionAtDelivery?.message;
  const confirmBundleError =
    errors.acceptOrderVerification?.message || errors.acceptReturnsPolicy?.message;

  return (
    <div
      className={`border border-dashed border-gray-300 bg-gray-50 p-5 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
      data-legal-acknowledgements
    >
      <div className="flex flex-col gap-5">
        {shippingMethod === 'delivery' && (
          <div>
            <div className={`flex items-start ${ROW_GAP}`}>
              <input
                id={`${baseId}-delivery-bundle`}
                type="checkbox"
                className={CHECKBOX_CLASS}
                disabled={isSubmitting}
                checked={deliveryBundleChecked}
                onChange={(e) => {
                  const next = e.target.checked;
                  setValue('acceptDeliverySupplyTerms', next, { shouldValidate: true });
                  setValue('acceptInspectionAtDelivery', next, { shouldValidate: true });
                }}
              />
              <label
                htmlFor={`${baseId}-delivery-bundle`}
                className={`${TEXT_CLASS} cursor-pointer`}
              >
                {t('checkout.legal.bundleDeliveryAndInspection')}
              </label>
            </div>
            {deliveryBundleError ? (
              <p className="mt-1 pl-8 text-sm text-red-600">{deliveryBundleError}</p>
            ) : null}
          </div>
        )}

        {shippingMethod === 'delivery' ? (
          <div>
            <div className={`flex items-start ${ROW_GAP}`}>
              <input
                id={`${baseId}-confirm-bundle`}
                type="checkbox"
                className={CHECKBOX_CLASS}
                disabled={isSubmitting}
                checked={confirmBundleChecked}
                onChange={(e) => {
                  const next = e.target.checked;
                  setValue('acceptOrderVerification', next, { shouldValidate: true });
                  setValue('acceptReturnsPolicy', next, { shouldValidate: true });
                }}
              />
              <label
                htmlFor={`${baseId}-confirm-bundle`}
                className={`${TEXT_CLASS} cursor-pointer`}
              >
                {t('checkout.legal.bundleVerificationAndReturns')}
              </label>
            </div>
            {confirmBundleError ? (
              <p className="mt-1 pl-8 text-sm text-red-600">{confirmBundleError}</p>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <label
                htmlFor={`${baseId}-verify`}
                className={`flex items-start ${ROW_GAP} cursor-pointer`}
              >
                <input
                  id={`${baseId}-verify`}
                  type="checkbox"
                  className={CHECKBOX_CLASS}
                  disabled={isSubmitting}
                  {...register('acceptOrderVerification')}
                />
                <span className={TEXT_CLASS}>{t('checkout.legal.orderVerification')}</span>
              </label>
              {errors.acceptOrderVerification?.message ? (
                <p className="mt-1 pl-8 text-sm text-red-600">
                  {errors.acceptOrderVerification.message}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor={`${baseId}-returns`}
                className={`flex items-start ${ROW_GAP} cursor-pointer`}
              >
                <input
                  id={`${baseId}-returns`}
                  type="checkbox"
                  className={CHECKBOX_CLASS}
                  disabled={isSubmitting}
                  {...register('acceptReturnsPolicy')}
                />
                <span className={TEXT_CLASS}>{t('checkout.legal.returnsPolicy')}</span>
              </label>
              {errors.acceptReturnsPolicy?.message ? (
                <p className="mt-1 pl-8 text-sm text-red-600">
                  {errors.acceptReturnsPolicy.message}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
