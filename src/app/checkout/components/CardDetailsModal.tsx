'use client';

import { Button } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import { PaymentMethodLogo } from './PaymentMethodLogo';
import { CardInputFields } from './CardInputFields';
import { OrderSummaryModal } from './OrderSummaryModal';
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
  shippingCity?: string;
  cart: Cart | null;
  orderSummary: {
    subtotalDisplay: number;
    taxDisplay: number;
    shippingDisplay: number;
    totalDisplay: number;
  };
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
  logoErrors: Record<string, boolean>;
  setLogoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isLoggedIn: boolean;
  onShowShippingModal: () => void;
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
  shippingCity,
  cart,
  orderSummary,
  currency,
  loadingDeliveryPrice,
  deliveryPrice,
  logoErrors,
  setLogoErrors,
  isLoggedIn,
  onShowShippingModal,
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
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
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
            shippingCity={shippingCity}
            loadingDeliveryPrice={loadingDeliveryPrice}
            deliveryPrice={deliveryPrice}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('checkout.buttons.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleSubmit(
              (data) => {
                onClose();
                if (!isLoggedIn) {
                  onShowShippingModal();
                } else {
                  onSubmit(data);
                }
              },
              handleValidationError
            )}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('checkout.buttons.processing') : t('checkout.buttons.continueToPayment')}
          </Button>
        </div>
      </div>
    </div>
  );
}

