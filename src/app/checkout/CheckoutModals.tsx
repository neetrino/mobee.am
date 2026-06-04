'use client';

import { UseFormRegister, UseFormSetValue, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { ShippingAddressModal } from './components/ShippingAddressModal';
import { CardDetailsModal } from './components/CardDetailsModal';
import { CheckoutFormData, Cart } from './types';

interface CheckoutModalsProps {
  showShippingModal: boolean;
  setShowShippingModal: (show: boolean) => void;
  showCardModal: boolean;
  setShowCardModal: (show: boolean) => void;
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  handleSubmit: UseFormHandleSubmit<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
  shippingMethod: 'pickup' | 'delivery';
  deliverySpeed: 'standard' | 'express';
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery' | 'aparik';
  shippingCity: string | undefined;
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
  onSubmit: (data: CheckoutFormData) => void;
}

export function CheckoutModals({
  showShippingModal,
  setShowShippingModal,
  showCardModal,
  setShowCardModal,
  register,
  setValue,
  handleSubmit,
  errors,
  isSubmitting,
  shippingMethod,
  deliverySpeed,
  paymentMethod,
  shippingCity,
  cart,
  orderSummary,
  currency,
  loadingDeliveryPrice,
  deliveryPrice,
  requiresRegionalQuote,
  logoErrors,
  setLogoErrors,
  onSubmit,
}: CheckoutModalsProps) {
  return (
    <>
      <ShippingAddressModal
        isOpen={showShippingModal}
        onClose={() => setShowShippingModal(false)}
        register={register}
        setValue={setValue}
        handleSubmit={handleSubmit}
        errors={errors}
        isSubmitting={isSubmitting}
        shippingMethod={shippingMethod}
        deliverySpeed={deliverySpeed}
        paymentMethod={paymentMethod}
        cart={cart}
        orderSummary={orderSummary}
        currency={currency}
        shippingCity={shippingCity}
        loadingDeliveryPrice={loadingDeliveryPrice}
        deliveryPrice={deliveryPrice}
        requiresRegionalQuote={requiresRegionalQuote}
        onSubmit={onSubmit}
      />

      <CardDetailsModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        register={register}
        setValue={setValue}
        handleSubmit={handleSubmit}
        errors={errors}
        isSubmitting={isSubmitting}
        paymentMethod={paymentMethod}
        shippingMethod={shippingMethod}
        deliverySpeed={deliverySpeed}
        shippingCity={shippingCity}
        cart={cart}
        orderSummary={orderSummary}
        currency={currency}
        loadingDeliveryPrice={loadingDeliveryPrice}
        deliveryPrice={deliveryPrice}
        requiresRegionalQuote={requiresRegionalQuote}
        logoErrors={logoErrors}
        setLogoErrors={setLogoErrors}
        onSubmit={onSubmit}
      />
    </>
  );
}
