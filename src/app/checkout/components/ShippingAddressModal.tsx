'use client';

import { Button, Input } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import { ContactInformation } from './ContactInformation';
import { CardInputFields } from './CardInputFields';
import { OrderSummaryModal } from './OrderSummaryModal';
import { CheckoutFormData, Cart } from '../types';

interface ShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  handleSubmit: UseFormHandleSubmit<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
  shippingMethod: 'pickup' | 'delivery';
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery';
  cart: Cart | null;
  orderSummary: {
    subtotalDisplay: number;
    taxDisplay: number;
    shippingDisplay: number;
    totalDisplay: number;
  };
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  shippingCity?: string;
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
  onSubmit: (data: CheckoutFormData) => void;
}

export function ShippingAddressModal({
  isOpen,
  onClose,
  register,
  setValue,
  handleSubmit,
  errors,
  isSubmitting,
  shippingMethod,
  paymentMethod,
  cart,
  orderSummary,
  currency,
  shippingCity,
  loadingDeliveryPrice,
  deliveryPrice,
  onSubmit,
}: ShippingAddressModalProps) {
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
            {shippingMethod === 'delivery' 
              ? t('checkout.modals.completeOrder') 
              : t('checkout.modals.confirmOrder')}
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

        <ContactInformation
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
        />

        {shippingMethod === 'delivery' ? (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.shippingAddress')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label={t('checkout.form.address')}
                    type="text"
                    placeholder={t('checkout.placeholders.address')}
                    {...register('shippingAddress')}
                    error={errors.shippingAddress?.message}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Input
                    label={t('checkout.form.city')}
                    type="text"
                    placeholder={t('checkout.placeholders.city')}
                    {...register('shippingCity')}
                    error={errors.shippingCity?.message}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {(errors.shippingAddress || errors.shippingCity) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  {errors.shippingAddress?.message || errors.shippingCity?.message}
                </p>
              </div>
            )}

            {(paymentMethod === 'arca' || paymentMethod === 'idram') && (
              <div className="space-y-4 mb-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('checkout.payment.paymentDetails')} (
                  {paymentMethod === 'idram' ? t('checkout.payment.idram') : t('checkout.payment.arca')})
                </h3>
                <CardInputFields
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {paymentMethod === 'cash_on_delivery' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 mt-6">
                <p className="text-sm text-green-800">
                  <strong>{t('checkout.payment.cashOnDelivery')}:</strong> {t('checkout.messages.cashOnDeliveryInfo')}
                </p>
              </div>
            )}

            <OrderSummaryModal
              cart={cart}
              orderSummary={orderSummary}
              currency={currency}
              shippingMethod={shippingMethod}
              shippingCity={shippingCity}
              loadingDeliveryPrice={loadingDeliveryPrice}
              deliveryPrice={deliveryPrice}
            />
          </>
        ) : (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>{t('checkout.shipping.storePickup')}:</strong> {t('checkout.messages.storePickupInfo')}
              </p>
            </div>

            {(paymentMethod === 'arca' || paymentMethod === 'idram') && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('checkout.payment.paymentDetails')} (
                  {paymentMethod === 'idram' ? t('checkout.payment.idram') : t('checkout.payment.arca')})
                </h3>
                <CardInputFields
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {paymentMethod === 'cash_on_delivery' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  <strong>{t('checkout.payment.cashOnDelivery')}:</strong> {t('checkout.messages.cashOnDeliveryPickup')}
                </p>
              </div>
            )}

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
        )}

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
                onSubmit(data);
              },
              handleValidationError
            )}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('checkout.buttons.processing') : t('checkout.buttons.placeOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
}

