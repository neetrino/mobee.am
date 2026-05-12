'use client';

import { useRouter } from 'next/navigation';
import { Card, Button } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { CheckoutForm } from './CheckoutForm';
import { CheckoutModals } from './CheckoutModals';
import { OrderSummary } from './OrderSummary';
import { useCheckout } from './useCheckout';
import {
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_PAGE_SHELL_CLASS,
} from './constants';

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const {
    cart,
    loading,
    error,
    setError,
    currency,
    logoErrors,
    setLogoErrors,
    showShippingModal,
    setShowShippingModal,
    showCardModal,
    setShowCardModal,
    showLoginRequiredModal,
    setShowLoginRequiredModal,
    deliveryPrice,
    loadingDeliveryPrice,
    requiresRegionalQuote,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setValue,
    watch,
    paymentMethod,
    shippingMethod,
    shippingCity,
    deliverySpeed,
    paymentMethods,
    orderSummary,
    handlePlaceOrder,
    onSubmit,
    isLoggedIn,
  } = useCheckout();

  if (loading) {
    return (
      <div className={CHECKOUT_PAGE_SHELL_CLASS}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className={`h-96 bg-gray-200 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`} />
            </div>
            <div className={`h-64 bg-gray-200 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={CHECKOUT_PAGE_SHELL_CLASS}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>
        <Card
          className={`p-6 text-center ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS}`}
        >
          <p className="text-gray-600 mb-4">{t('checkout.errors.cartEmpty')}</p>
          <Button variant="brand" className="!rounded-full" onClick={() => router.push('/products')}>
            {t('checkout.buttons.continueShopping')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={CHECKOUT_PAGE_SHELL_CLASS}>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>

      <form onSubmit={handlePlaceOrder}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <CheckoutForm
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            isSubmitting={isSubmitting}
            shippingMethod={shippingMethod}
            deliverySpeed={deliverySpeed}
            paymentMethod={paymentMethod}
            paymentMethods={paymentMethods}
            logoErrors={logoErrors}
            setLogoErrors={setLogoErrors}
            error={error}
            setError={setError}
          />

          <OrderSummary
            cart={cart}
            orderSummary={orderSummary}
            currency={currency}
            shippingMethod={shippingMethod}
            deliverySpeed={deliverySpeed}
            shippingCity={shippingCity}
            loadingDeliveryPrice={loadingDeliveryPrice}
            deliveryPrice={deliveryPrice}
            requiresRegionalQuote={requiresRegionalQuote}
            error={error}
            isSubmitting={isSubmitting}
            register={register}
            promoCodeError={errors.promoCode?.message}
            onPlaceOrder={(e) => {
              if (e) {
                handlePlaceOrder(e);
              } else {
                handlePlaceOrder({ preventDefault: () => {} } as React.FormEvent);
              }
            }}
          />
        </div>
      </form>

      <CheckoutModals
        showShippingModal={showShippingModal}
        setShowShippingModal={setShowShippingModal}
        showCardModal={showCardModal}
        setShowCardModal={setShowCardModal}
        showLoginRequiredModal={showLoginRequiredModal}
        setShowLoginRequiredModal={setShowLoginRequiredModal}
        register={register}
        setValue={setValue}
        handleSubmit={handleSubmit}
        errors={errors}
        isSubmitting={isSubmitting}
        shippingMethod={shippingMethod}
        deliverySpeed={deliverySpeed}
        paymentMethod={paymentMethod}
        shippingCity={shippingCity}
        cart={cart}
        orderSummary={orderSummary}
        currency={currency}
        loadingDeliveryPrice={loadingDeliveryPrice}
        deliveryPrice={deliveryPrice}
        requiresRegionalQuote={requiresRegionalQuote}
        logoErrors={logoErrors}
        setLogoErrors={setLogoErrors}
        isLoggedIn={isLoggedIn}
        onSubmit={onSubmit}
      />
    </div>
  );
}
