'use client';

import { Card, Input } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../lib/i18n-client';
import { CheckoutFormData } from './types';
import {
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_OPTION_SELECTED_CHROME_CLASS,
  CHECKOUT_RADIO_ACCENT_CLASS,
} from './constants';

const CHECKOUT_FORM_SECTION_CARD_CLASS = `p-6 ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS}`;

interface CheckoutFormProps {
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
  shippingMethod: 'pickup' | 'delivery';
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery';
  paymentMethods: Array<{
    id: 'idram' | 'arca' | 'cash_on_delivery';
    name: string;
    description: string;
    logo: string | null;
  }>;
  logoErrors: Record<string, boolean>;
  setLogoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function CheckoutForm({
  register,
  setValue,
  errors,
  isSubmitting,
  shippingMethod,
  paymentMethod,
  paymentMethods,
  logoErrors,
  setLogoErrors,
  error,
  setError,
}: CheckoutFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 lg:col-span-2">
      {/* Contact Information */}
      <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS}>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.contactInformation')}</h2>
        <div className="flex flex-col gap-4">
          <Input
            label={t('checkout.form.firstName')}
            type="text"
            {...register('firstName')}
            error={errors.firstName?.message}
            disabled={isSubmitting}
          />
          <Input
            label={t('checkout.form.lastName')}
            type="text"
            {...register('lastName')}
            error={errors.lastName?.message}
            disabled={isSubmitting}
          />
          <Input
            label={t('checkout.form.email')}
            type="email"
            {...register('email')}
            error={errors.email?.message}
            disabled={isSubmitting}
          />
          <Input
            label={t('checkout.form.phone')}
            type="tel"
            placeholder={t('checkout.placeholders.phone')}
            {...register('phone')}
            error={errors.phone?.message}
            disabled={isSubmitting}
          />
        </div>
      </Card>

      {/* Promo Code */}
      <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS}>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.promoCode.title')}</h2>
        <Input
          label={t('checkout.form.promoCode')}
          type="text"
          placeholder={t('checkout.placeholders.promoCode')}
          {...register('promoCode')}
          error={errors.promoCode?.message}
          disabled={isSubmitting}
        />
      </Card>

      {/* Shipping Method */}
      <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS}>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.shippingMethod')}</h2>
        {errors.shippingMethod && (
          <div
            className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
          >
            <p className="text-sm text-red-600">{errors.shippingMethod.message}</p>
          </div>
        )}
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-center border-2 p-4 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
              shippingMethod === 'pickup'
                ? CHECKOUT_OPTION_SELECTED_CHROME_CLASS
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              {...register('shippingMethod')}
              value="pickup"
              checked={shippingMethod === 'pickup'}
              onChange={(e) => setValue('shippingMethod', e.target.value as 'pickup' | 'delivery')}
              className={`mr-4 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{t('checkout.shipping.storePickup')}</div>
              <div className="text-sm text-gray-600">{t('checkout.shipping.storePickupDescription')}</div>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-center border-2 p-4 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
              shippingMethod === 'delivery'
                ? CHECKOUT_OPTION_SELECTED_CHROME_CLASS
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              {...register('shippingMethod')}
              value="delivery"
              checked={shippingMethod === 'delivery'}
              onChange={(e) => setValue('shippingMethod', e.target.value as 'pickup' | 'delivery')}
              className={`mr-4 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{t('checkout.shipping.delivery')}</div>
              <div className="text-sm text-gray-600">{t('checkout.shipping.deliveryDescription')}</div>
            </div>
          </label>
        </div>
      </Card>

      {/* Shipping Address - Only show for delivery */}
      {shippingMethod === 'delivery' && (
        <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS} data-shipping-section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.shippingAddress')}</h2>
          {(error && error.includes('shipping address')) || (errors.shippingAddress || errors.shippingCity) ? (
            <div
              className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
            >
              <p className="text-sm text-red-600">
                {error && error.includes('shipping address') 
                  ? error 
                  : (errors.shippingAddress?.message || 
                     errors.shippingCity?.message)}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label={t('checkout.form.address')}
                type="text"
                placeholder={t('checkout.placeholders.address')}
                {...register('shippingAddress', {
                  onChange: () => {
                    if (error && error.includes('shipping address')) {
                      setError(null);
                    }
                  }
                })}
                error={errors.shippingAddress?.message}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input
                label={t('checkout.form.city')}
                type="text"
                placeholder={t('checkout.placeholders.city')}
                {...register('shippingCity', {
                  onChange: () => {
                    if (error && error.includes('shipping address')) {
                      setError(null);
                    }
                  }
                })}
                error={errors.shippingCity?.message}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Payment Method */}
      <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS}>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.paymentMethod')}</h2>
        {errors.paymentMethod && (
          <div
            className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
          >
            <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>
          </div>
        )}
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className={`flex cursor-pointer items-center border-2 p-4 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
                paymentMethod === method.id
                  ? CHECKOUT_OPTION_SELECTED_CHROME_CLASS
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                {...register('paymentMethod')}
                value={method.id}
                checked={paymentMethod === method.id}
                onChange={(e) => setValue('paymentMethod', e.target.value as 'idram' | 'arca' | 'cash_on_delivery')}
                className={`mr-4 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
                disabled={isSubmitting}
              />
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-20 h-12 flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  {!method.logo || logoErrors[method.id] ? (
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ) : (
                    <img
                      src={method.logo}
                      alt={method.name}
                      className="w-full h-full object-contain p-1.5"
                      loading="lazy"
                      onError={() => {
                        setLogoErrors((prev) => ({ ...prev, [method.id]: true }));
                      }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{method.name}</div>
                  <div className="text-sm text-gray-600">{method.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}



