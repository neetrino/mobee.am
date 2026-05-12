'use client';

import { Card, Input } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../lib/i18n-client';
import { CheckoutFormData } from './types';
import {
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_BOTTOM_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_TOP_CLASS,
  CHECKOUT_OPTION_SELECTED_CHROME_CLASS,
  CHECKOUT_RADIO_ACCENT_CLASS,
} from './constants';
import { DeliveryPolicyInfoCard } from './components/DeliveryPolicyInfoCard';
import { CheckoutLegalAcknowledgements } from './components/CheckoutLegalAcknowledgements';
import { ShippingCitySelect } from './components/ShippingCitySelect';

const CHECKOUT_FORM_SECTION_CARD_CLASS = `p-6 ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS}`;

interface CheckoutFormProps {
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  watch: UseFormWatch<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
  shippingMethod: 'pickup' | 'delivery';
  deliverySpeed: 'standard' | 'express';
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
  watch,
  errors,
  isSubmitting,
  shippingMethod,
  deliverySpeed,
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
              onChange={(e) =>
                setValue('shippingMethod', e.target.value as 'pickup' | 'delivery', {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className={`mr-4 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{t('checkout.shipping.storePickup')}</div>
              <div className="text-sm text-gray-600">{t('checkout.shipping.storePickupDescription')}</div>
            </div>
          </label>
          <div
            className={`${CHECKOUT_FORM_CARD_RADIUS_CLASS} border-2 transition-colors ${
              shippingMethod === 'delivery'
                ? `${CHECKOUT_OPTION_SELECTED_CHROME_CLASS} ring-1 ring-admin-200/80`
                : 'border-gray-300 bg-white hover:bg-gray-50/60'
            }`}
          >
            <label
              className={`flex cursor-pointer items-center p-4 ${
                shippingMethod === 'delivery' ? CHECKOUT_FORM_CARD_RADIUS_TOP_CLASS : ''
              }`}
            >
              <input
                type="radio"
                {...register('shippingMethod')}
                value="delivery"
                checked={shippingMethod === 'delivery'}
                onChange={() => {
                  setValue('shippingMethod', 'delivery', { shouldValidate: true, shouldDirty: true });
                  setValue('deliverySpeed', 'standard', { shouldValidate: true });
                }}
                className={`mr-4 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
                disabled={isSubmitting}
                aria-controls={
                  shippingMethod === 'delivery' ? 'delivery-type-options' : undefined
                }
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{t('checkout.shipping.delivery')}</div>
                <div className="text-sm text-gray-600">{t('checkout.shipping.deliveryDescription')}</div>
              </div>
            </label>

            {shippingMethod === 'delivery' && (
              <div
                id="delivery-type-options"
                role="group"
                aria-label={t('checkout.shipping.deliveryTypesGroupLabel')}
                className={`border-t border-admin-200/90 bg-white/90 px-4 pb-4 pt-3 ${CHECKOUT_FORM_CARD_RADIUS_BOTTOM_CLASS}`}
              >
                <div className="ml-0.5 space-y-2 border-l-2 border-admin-400 pl-3">
                  <label
                    className={`flex cursor-pointer items-start gap-3 border p-3 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
                      deliverySpeed === 'standard'
                        ? `${CHECKOUT_OPTION_SELECTED_CHROME_CLASS}`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      {...register('deliverySpeed')}
                      value="standard"
                      checked={deliverySpeed === 'standard'}
                      onChange={(e) =>
                        setValue('deliverySpeed', e.target.value as 'standard' | 'express', {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      className={`mt-0.5 h-4 w-4 shrink-0 ${CHECKOUT_RADIO_ACCENT_CLASS} focus:ring-2 focus:ring-admin-500 focus:ring-offset-0`}
                      disabled={isSubmitting}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {t('checkout.shipping.standardDelivery')}
                      </div>
                      <div className="text-xs text-gray-600 leading-snug mt-0.5">
                        {t('checkout.shipping.standardDeliveryDescription')}
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 border p-3 transition-all ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${
                      deliverySpeed === 'express'
                        ? `${CHECKOUT_OPTION_SELECTED_CHROME_CLASS}`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      {...register('deliverySpeed')}
                      value="express"
                      checked={deliverySpeed === 'express'}
                      onChange={(e) =>
                        setValue('deliverySpeed', e.target.value as 'standard' | 'express', {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      className={`mt-0.5 h-4 w-4 shrink-0 ${CHECKOUT_RADIO_ACCENT_CLASS} focus:ring-2 focus:ring-admin-500 focus:ring-offset-0`}
                      disabled={isSubmitting}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {t('checkout.shipping.expressDelivery')}
                      </div>
                      <div className="text-xs text-gray-600 leading-snug mt-0.5">
                        {t('checkout.shipping.expressDeliveryDescription')}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {shippingMethod === 'delivery' && (
        <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS} data-shipping-section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.shippingAddress')}</h2>
          {(error && error.includes('shipping address')) || errors.shippingAddress || errors.shippingCity ? (
            <div
              className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
            >
              <p className="text-sm text-red-600">
                {error && error.includes('shipping address')
                  ? error
                  : errors.shippingAddress?.message || errors.shippingCity?.message}
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
                  },
                })}
                error={errors.shippingAddress?.message}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <ShippingCitySelect
                register={register}
                error={errors.shippingCity?.message}
                disabled={isSubmitting}
                onAfterChange={() => {
                  if (error && error.includes('shipping address')) {
                    setError(null);
                  }
                }}
              />
            </div>
          </div>
        </Card>
      )}

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
                onChange={(e) =>
                  setValue('paymentMethod', e.target.value as 'idram' | 'arca' | 'cash_on_delivery', {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className={`mr-4 ${CHECKOUT_RADIO_ACCENT_CLASS}`}
                disabled={isSubmitting}
              />
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-20 h-12 flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  {!method.logo || logoErrors[method.id] ? (
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
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

      <DeliveryPolicyInfoCard />

      <CheckoutLegalAcknowledgements
        register={register}
        setValue={setValue}
        watch={watch}
        errors={errors}
        shippingMethod={shippingMethod}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
