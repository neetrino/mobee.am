'use client';

import { Card, Input } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../lib/i18n-client';
import { CheckoutFormData } from './types';
import { DeliveryPolicyInfoCard } from './components/DeliveryPolicyInfoCard';
import { CheckoutLegalAcknowledgements } from './components/CheckoutLegalAcknowledgements';

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
    <div className="lg:col-span-2 space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.contactInformation')}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </Card>

      <Card className="p-6">
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

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.shippingMethod')}</h2>
        {errors.shippingMethod && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.shippingMethod.message}</p>
          </div>
        )}
        <div className="space-y-3">
          <label
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              shippingMethod === 'pickup'
                ? 'border-purple-600 bg-purple-50'
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
              className="mr-4"
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{t('checkout.shipping.storePickup')}</div>
              <div className="text-sm text-gray-600">{t('checkout.shipping.storePickupDescription')}</div>
            </div>
          </label>

          <div
            className={`rounded-lg border-2 transition-colors ${
              shippingMethod === 'delivery'
                ? 'border-purple-600 bg-purple-50/90 ring-1 ring-purple-200/80'
                : 'border-gray-300 bg-white hover:bg-gray-50/60'
            }`}
          >
            <label
              className={`flex items-center p-4 cursor-pointer ${
                shippingMethod === 'delivery' ? 'rounded-t-lg' : 'rounded-lg'
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
                className="mr-4"
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
                className="border-t border-purple-200/90 bg-white/90 rounded-b-lg px-4 pb-4 pt-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-900 mb-1">
                  {t('checkout.shipping.deliveryTypesTitle')}
                </p>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {t('checkout.shipping.deliveryTypesHint')}
                </p>
                <div className="space-y-2 border-l-2 border-purple-400 pl-3 ml-0.5">
                  <label
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-all ${
                      deliverySpeed === 'standard'
                        ? 'border-purple-500 bg-purple-50/90'
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
                      className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 focus:ring-purple-500"
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
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-all ${
                      deliverySpeed === 'express'
                        ? 'border-purple-500 bg-purple-50/90'
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
                      className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 focus:ring-purple-500"
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

      {shippingMethod === 'delivery' && <DeliveryPolicyInfoCard />}

      {shippingMethod === 'delivery' && (
        <Card className="p-6" data-shipping-section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.shippingAddress')}</h2>
          {(error && error.includes('shipping address')) || errors.shippingAddress || errors.shippingCity ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
              <Input
                label={t('checkout.form.city')}
                type="text"
                placeholder={t('checkout.placeholders.city')}
                {...register('shippingCity', {
                  onChange: () => {
                    if (error && error.includes('shipping address')) {
                      setError(null);
                    }
                  },
                })}
                error={errors.shippingCity?.message}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.paymentMethod')}</h2>
        {errors.paymentMethod && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>
          </div>
        )}
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === method.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                {...register('paymentMethod')}
                value={method.id}
                checked={paymentMethod === method.id}
                onChange={(e) => setValue('paymentMethod', e.target.value as 'idram' | 'arca' | 'cash_on_delivery')}
                className="mr-4"
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
