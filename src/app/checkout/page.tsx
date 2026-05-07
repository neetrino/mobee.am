'use client';

import { useRouter } from 'next/navigation';
import { Card, Button } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { CheckoutForm } from './CheckoutForm';
import { CheckoutModals } from './CheckoutModals';
import { OrderSummary } from './OrderSummary';
import { useCheckout } from './useCheckout';
import { CHECKOUT_PAGE_SHELL_CLASS } from './constants';

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
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setValue,
    paymentMethod,
    shippingMethod,
    shippingCity,
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
              <div className="h-96 rounded bg-gray-200" />
            </div>
            <div className="h-64 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={CHECKOUT_PAGE_SHELL_CLASS}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>
        <Card className="p-6 text-center">
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
            errors={errors}
            isSubmitting={isSubmitting}
            shippingMethod={shippingMethod}
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
            shippingCity={shippingCity}
            loadingDeliveryPrice={loadingDeliveryPrice}
            deliveryPrice={deliveryPrice}
            error={error}
            isSubmitting={isSubmitting}
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
        paymentMethod={paymentMethod}
        shippingCity={shippingCity}
        cart={cart}
        orderSummary={orderSummary}
        currency={currency}
        loadingDeliveryPrice={loadingDeliveryPrice}
        deliveryPrice={deliveryPrice}
        logoErrors={logoErrors}
        setLogoErrors={setLogoErrors}
        isLoggedIn={isLoggedIn}
        onSubmit={onSubmit}
      />
    </div>
  );
}
