'use client';

import { Button } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import { PaymentMethodLogo } from './PaymentMethodLogo';
import { CardInputFields } from './CardInputFields';
import { OrderSummaryModal } from './OrderSummaryModal';
import { CHECKOUT_FORM_CARD_RADIUS_CLASS } from '../constants';
import { CheckoutFormData, Cart } from '../types';

interface CardDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  handleSubmit: UseFormHandleSubmit<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery';
  shippingMethod: 'pickup' | 'delivery';
  deliverySpeed: 'standard' | 'express';
  shippingCity?: string;
  cart: Cart | null;
  orderSummary: {
    subtotalDisplay: number;
    taxDisplay: number;
    shippingDisplay: number;
    totalDisplay: number;
    totalExcludesPendingShipping: boolean;
  };
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
  requiresRegionalQuote: boolean;
  logoErrors: Record<string, boolean>;
  setLogoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  onSubmit: (data: CheckoutFormData) => void;
}

export function CardDetailsModal({
  isOpen,
  onClose,
  register,
  setValue,
  handleSubmit,
  errors,
  isSubmitting,
  paymentMethod,
  shippingMethod,
  deliverySpeed,
  shippingCity,
  cart,
  orderSummary,
  currency,
  loadingDeliveryPrice,
  deliveryPrice,
  requiresRegionalQuote,
  logoErrors,
  setLogoErrors,
  isLoggedIn,
  onRequireLogin,
  onSubmit,
}: CardDetailsModalProps) {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  const handleValidationError = (validationErrors: FieldErrors<CheckoutFormData>) => {
    const firstErrorField = Object.keys(validationErrors)[0];
    if (firstErrorField) {
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleLogoError = () => {
    setLogoErrors((prev) => ({ ...prev, [paymentMethod]: true }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('checkout.modals.cardDetails').replace(
              '{method}',
              paymentMethod === 'arca' ? t('checkout.payment.arca') : t('checkout.payment.idram')
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:text-admin-600"
            aria-label={t('checkout.modals.closeModal')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <PaymentMethodLogo
              paymentMethod={paymentMethod}
              logoErrors={logoErrors}
              onError={handleLogoError}
              size="medium"
            />
            <div>
              <div className="font-semibold text-gray-900">
                {paymentMethod === 'arca' ? t('checkout.payment.arca') : t('checkout.payment.idram')} {t('checkout.payment.paymentDetails')}
              </div>
              <div className="text-sm text-gray-600">{t('checkout.payment.enterCardDetails')}</div>
            </div>
          </div>

          <CardInputFields
            register={register}
            setValue={setValue}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        </div>

        {(errors.cardNumber || errors.cardExpiry || errors.cardCvv || errors.cardHolderName) && (
          <div
            className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
          >
            <p className="text-sm text-red-600">
              {errors.cardNumber?.message || 
               errors.cardExpiry?.message || 
               errors.cardCvv?.message || 
               errors.cardHolderName?.message}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t('checkout.orderSummary')}</h3>
          <OrderSummaryModal
            cart={cart}
            orderSummary={orderSummary}
            currency={currency}
            shippingMethod={shippingMethod}
            deliverySpeed={deliverySpeed}
            shippingCity={shippingCity}
            loadingDeliveryPrice={loadingDeliveryPrice}
            deliveryPrice={deliveryPrice}
            requiresRegionalQuote={requiresRegionalQuote}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 !rounded-full"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('checkout.buttons.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 !rounded-full"
            onClick={handleSubmit(
              (data) => {
                onClose();
                if (!isLoggedIn) {
                  onRequireLogin();
                } else {
                  onSubmit(data);
                }
              },
              handleValidationError
            )}
            disabled={isSubmitting || (shippingMethod === 'delivery' && requiresRegionalQuote)}
          >
            {isSubmitting ? t('checkout.buttons.processing') : t('checkout.buttons.continueToPayment')}
          </Button>
        </div>
      </div>
    </div>
  );
}

