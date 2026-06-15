import { PAYMENT_ICON_SRC } from '../../../lib/constants/ui-icons.constants';
import { useTranslation } from '../../../lib/i18n-client';

export type PaymentMethodId = 'idram' | 'arca' | 'cash_on_delivery' | 'aparik';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  logo: string | null;
}

interface FilterPaymentMethodsOptions {
  shippingMethod: 'pickup' | 'delivery';
}

export function filterPaymentMethods(
  methods: PaymentMethod[],
  { shippingMethod }: FilterPaymentMethodsOptions
): PaymentMethod[] {
  return methods.filter((method) => {
    if (method.id === 'cash_on_delivery' && shippingMethod === 'delivery') {
      return false;
    }
    return true;
  });
}

export function usePaymentMethods(): PaymentMethod[] {
  const { t } = useTranslation();

  return [
    {
      id: 'cash_on_delivery',
      name: t('checkout.payment.cashOnDelivery'),
      description: t('checkout.payment.cashOnDeliveryDescription'),
      logo: PAYMENT_ICON_SRC.cashOnDelivery,
    },
    {
      id: 'idram',
      name: t('checkout.payment.idram'),
      description: t('checkout.payment.idramDescription'),
      logo: PAYMENT_ICON_SRC.idram,
    },
    {
      id: 'arca',
      name: t('checkout.payment.arca'),
      description: t('checkout.payment.arcaDescription'),
      logo: PAYMENT_ICON_SRC.arca,
    },
  ];
}




