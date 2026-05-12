import { z } from 'zod';
import { useTranslation } from '../../../lib/i18n-client';

export function useCheckoutSchema() {
  const { t } = useTranslation();

  return z
    .object({
      firstName: z.string().min(1, t('checkout.errors.firstNameRequired')),
      lastName: z.string().min(1, t('checkout.errors.lastNameRequired')),
      email: z.string().email(t('checkout.errors.invalidEmail')).min(1, t('checkout.errors.emailRequired')),
      phone: z
        .string()
        .min(1, t('checkout.errors.phoneRequired'))
        .regex(/^\+?[0-9]{8,15}$/, t('checkout.errors.invalidPhone')),
      shippingMethod: z.enum(['pickup', 'delivery'], {
        message: t('checkout.errors.selectShippingMethod'),
      }),
      deliverySpeed: z.enum(['standard', 'express']),
      paymentMethod: z.enum(['idram', 'arca', 'cash_on_delivery'], {
        message: t('checkout.errors.selectPaymentMethod'),
      }),
      promoCode: z
        .string()
        .trim()
        .max(64, t('checkout.errors.promoCodeTooLong'))
        .regex(/^[A-Za-z0-9_-]*$/, t('checkout.errors.invalidPromoCode'))
        .optional()
        .or(z.literal('')),
      shippingAddress: z.string().optional(),
      shippingCity: z.string().optional(),
      cardNumber: z.string().optional(),
      cardExpiry: z.string().optional(),
      cardCvv: z.string().optional(),
      cardHolderName: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.shippingMethod === 'delivery') {
          return Boolean(data.shippingAddress && data.shippingAddress.trim().length > 0);
        }
        return true;
      },
      {
        message: t('checkout.errors.addressRequired'),
        path: ['shippingAddress'],
      }
    )
    .refine(
      (data) => {
        if (data.shippingMethod === 'delivery') {
          return Boolean(data.shippingCity && data.shippingCity.trim().length > 0);
        }
        return true;
      },
      {
        message: t('checkout.errors.cityRequired'),
        path: ['shippingCity'],
      }
    )
    .refine(
      (data) => {
        if (data.paymentMethod === 'arca' || data.paymentMethod === 'idram') {
          return Boolean(data.cardNumber && data.cardNumber.replace(/\s/g, '').length >= 13);
        }
        return true;
      },
      {
        message: t('checkout.errors.cardNumberRequired'),
        path: ['cardNumber'],
      }
    )
    .refine(
      (data) => {
        if (data.paymentMethod === 'arca' || data.paymentMethod === 'idram') {
          return Boolean(data.cardExpiry && /^\d{2}\/\d{2}$/.test(data.cardExpiry));
        }
        return true;
      },
      {
        message: t('checkout.errors.cardExpiryRequired'),
        path: ['cardExpiry'],
      }
    )
    .refine(
      (data) => {
        if (data.paymentMethod === 'arca' || data.paymentMethod === 'idram') {
          return Boolean(data.cardCvv && data.cardCvv.length >= 3);
        }
        return true;
      },
      {
        message: t('checkout.errors.cvvRequired'),
        path: ['cardCvv'],
      }
    )
    .refine(
      (data) => {
        if (data.paymentMethod === 'arca' || data.paymentMethod === 'idram') {
          return Boolean(data.cardHolderName && data.cardHolderName.trim().length > 0);
        }
        return true;
      },
      {
        message: t('checkout.errors.cardHolderNameRequired'),
        path: ['cardHolderName'],
      }
    );
}
