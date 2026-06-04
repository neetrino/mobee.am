import { useState, useEffect, useMemo } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getStoredCurrency } from '../../lib/currency';
import { getStoredLanguage } from '../../lib/language';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { usePaymentMethods } from './utils/payment-methods';
import { useCheckoutSchema } from './utils/validation-schema';
import { useDeliveryPrice } from './hooks/useDeliveryPrice';
import { useCart } from './hooks/useCart';
import { useUserProfile } from './hooks/useUserProfile';
import { useOrderSubmission } from './hooks/useOrderSubmission';
import { useOrderSummary } from './hooks/useOrderSummary';
import type { CheckoutFormData } from './types';
import { scrollToFirstFieldError } from './utils/scroll-to-first-field-error';
import { getCartSubtotalAfterDiscountAmd } from '../../lib/checkout/cart-subtotal-amd';
import { isDeliveryAvailableForSubtotalAmd } from '../../lib/checkout/delivery-eligibility';

export function useCheckout() {
  const { isLoggedIn, isLoading } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [_language, setLanguage] = useState(getStoredLanguage());
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const paymentMethods = usePaymentMethods();
  const { cart, loading, fetchCart } = useCart(isLoggedIn);
  const subtotalAfterDiscountAmd = useMemo(
    () => (cart ? getCartSubtotalAfterDiscountAmd(cart.totals) : 0),
    [cart]
  );
  const deliveryAvailable = isDeliveryAvailableForSubtotalAmd(subtotalAfterDiscountAmd);
  const checkoutSchema = useCheckoutSchema(deliveryAvailable);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    clearErrors,
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      shippingMethod: 'pickup',
      deliverySpeed: 'standard',
      paymentMethod: 'cash_on_delivery',
      promoCode: '',
      shippingAddress: '',
      shippingCity: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: '',
      cardHolderName: '',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const shippingMethod = watch('shippingMethod');
  const shippingCity = watch('shippingCity');
  const deliverySpeed = watch('deliverySpeed');

  const { deliveryPrice, loadingDeliveryPrice, requiresRegionalQuote } = useDeliveryPrice(
    cart,
    shippingMethod,
    shippingCity,
    deliverySpeed
  );
  useUserProfile(isLoggedIn, isLoading, setValue);

  const { submitOrder } = useOrderSubmission({
    cart,
    isLoggedIn,
    deliveryPrice,
    requiresRegionalQuote,
    deliveryAvailable,
    currency,
    setError,
  });

  const { orderSummary } = useOrderSummary({
    cart,
    shippingMethod,
    deliveryPrice,
    currency,
    requiresRegionalQuote,
  });

  useEffect(() => {
    if (shippingMethod === 'pickup') {
      setValue('deliverySpeed', 'standard');
    }
  }, [shippingMethod, setValue]);

  useEffect(() => {
    if (!deliveryAvailable) {
      if (shippingMethod === 'delivery') {
        setValue('shippingMethod', 'pickup', { shouldValidate: true, shouldDirty: true });
      }
      setValue('deliverySpeed', 'standard');
      setValue('shippingAddress', '');
      setValue('shippingCity', '');
      clearErrors(['shippingAddress', 'shippingCity']);
    }
  }, [deliveryAvailable, shippingMethod, setValue, clearErrors]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    fetchCart();

    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    const handleLanguageUpdate = () => {
      setLanguage(getStoredLanguage());
    };

    const handleCurrencyRatesUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('language-updated', handleLanguageUpdate);
    window.addEventListener('currency-rates-updated', handleCurrencyRatesUpdate);

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('language-updated', handleLanguageUpdate);
      window.removeEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
    };
  }, [isLoggedIn, isLoading, fetchCart]);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    setError(null);

    handleSubmit(
      (data) => {
        if (data.shippingMethod === 'delivery' && requiresRegionalQuote) {
          setError(t('checkout.errors.regionalQuoteRequired'));
          document
            .querySelector('[data-shipping-section]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        if (paymentMethod === 'arca' || paymentMethod === 'idram') {
          setShowCardModal(true);
          return;
        }

        submitOrder(data);
      },
      (validationErrors: FieldErrors<CheckoutFormData>) => {
        scrollToFirstFieldError(validationErrors);
      }
    )(e);
  };

  const onSubmit = (data: CheckoutFormData) => {
    submitOrder(data);
  };

  return {
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
    deliveryPrice,
    loadingDeliveryPrice,
    requiresRegionalQuote,
    deliveryAvailable,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setValue,
    paymentMethod,
    shippingMethod,
    shippingCity,
    deliverySpeed,
    paymentMethods,
    orderSummary,
    handlePlaceOrder,
    onSubmit,
    isLoggedIn,
  };
}
