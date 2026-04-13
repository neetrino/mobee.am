import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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

export function useCheckout() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [language, setLanguage] = useState(getStoredLanguage());
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const paymentMethods = usePaymentMethods();
  const checkoutSchema = useCheckoutSchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      shippingMethod: 'pickup',
      paymentMethod: 'cash_on_delivery',
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

  const { deliveryPrice, loadingDeliveryPrice } = useDeliveryPrice(shippingMethod, shippingCity);
  const { cart, loading, fetchCart } = useCart(isLoggedIn);
  useUserProfile(isLoggedIn, isLoading, setValue);

  const { submitOrder } = useOrderSubmission({
    cart,
    isLoggedIn,
    deliveryPrice,
    setError,
  });

  const { orderSummary } = useOrderSummary({
    cart,
    shippingMethod,
    deliveryPrice,
    currency,
  });

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
    
    if (shippingMethod === 'delivery') {
      const formData = watch();
      const hasShippingAddress = formData.shippingAddress && formData.shippingAddress.trim().length > 0;
      const hasShippingCity = formData.shippingCity && formData.shippingCity.trim().length > 0;
      
      if (!hasShippingAddress || !hasShippingCity) {
        setError(t('checkout.errors.fillShippingAddress'));
        const shippingSection = document.querySelector('[data-shipping-section]');
        if (shippingSection) {
          shippingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }
    
    if (paymentMethod === 'arca' || paymentMethod === 'idram') {
      setShowCardModal(true);
      return;
    }
    
    if (!isLoggedIn) {
      setShowShippingModal(true);
      return;
    }
    
    handleSubmit(submitOrder)(e);
  };

  const onSubmit = (data: CheckoutFormData) => {
    submitOrder(data);
  };

  return {
    // State
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
    // Form
    register,
    handleSubmit,
    errors,
    isSubmitting,
    setValue,
    watch,
    // Computed
    paymentMethod,
    shippingMethod,
    shippingCity,
    paymentMethods,
    orderSummary,
    // Actions
    handlePlaceOrder,
    onSubmit,
    // Auth
    isLoggedIn,
  };
}
