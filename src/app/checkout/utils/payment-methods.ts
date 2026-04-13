import { useTranslation } from '../../../lib/i18n-client';

export type PaymentMethodId = 'idram' | 'arca' | 'cash_on_delivery';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  logo: string | null;
}

export function usePaymentMethods(): PaymentMethod[] {
  const { t } = useTranslation();

  return [
    {
      id: 'cash_on_delivery',
      name: t('checkout.payment.cashOnDelivery'),
      description: t('checkout.payment.cashOnDeliveryDescription'),
      logo: null,
    },
    {
      id: 'idram',
      name: t('checkout.payment.idram'),
      description: t('checkout.payment.idramDescription'),
      logo: '/assets/payments/idram.svg',
    },
    {
      id: 'arca',
      name: t('checkout.payment.arca'),
      description: t('checkout.payment.arcaDescription'),
      logo: '/assets/payments/arca.svg',
    },
  ];
}




