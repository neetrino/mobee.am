'use client';

import { Card, Input } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../lib/i18n-client';
import { CheckoutFormData } from './types';
import {
  CHECKOUT_CONTACT_FIELDS_GRID_CLASS,
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_OPTION_SELECTED_CHROME_CLASS,
  CHECKOUT_RADIO_ACCENT_CLASS,
} from './constants';
import { CheckoutPaymentMethodLogo } from './components/CheckoutPaymentMethodLogo';
import { PurchaseIntentSection } from './components/PurchaseIntentSection';
import { ShippingCitySelect } from './components/ShippingCitySelect';

const CHECKOUT_FORM_SECTION_CARD_CLASS = `p-6 ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS}`;

interface CheckoutFormProps {
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
  purchaseIntent: 'buy_now' | 'aparik';
  shippingMethod: 'pickup' | 'delivery';
  shippingCity?: string;
  deliveryAvailable: boolean;
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery' | 'aparik';
  paymentMethods: Array<{
    id: 'idram' | 'arca' | 'cash_on_delivery' | 'aparik';
    name: string;
    description: string;
    logo: string | null;
  }>;
  logoErrors: Record<string, boolean>;
  setLogoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function CheckoutForm({
  register,
  setValue,
  errors,
  isSubmitting,
  purchaseIntent,
  shippingMethod,
  shippingCity = '',
  deliveryAvailable,
  paymentMethod,
  paymentMethods,
  logoErrors,
  setLogoErrors,
  setError,
}: CheckoutFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 lg:col-span-7">
      <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS}>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.contactInformation')}</h2>
        <div className={CHECKOUT_CONTACT_FIELDS_GRID_CLASS}>
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

      <PurchaseIntentSection
        register={register}
        setValue={setValue}
        purchaseIntent={purchaseIntent}
        isSubmitting={isSubmitting}
      />

      {purchaseIntent === 'buy_now' && (
      <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS} data-shipping-method-section>
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
          {deliveryAvailable ? (
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
                <div className="font-medium text-gray-900">{t('checkout.shipping.delivery')}</div>
                <div className="text-sm text-gray-600">{t('checkout.shipping.deliveryDescription')}</div>
              </div>
            </label>
          ) : (
            <p
              className={`border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
              role="status"
            >
              {t('checkout.shipping.deliveryUnavailableBelowMinimum')}
            </p>
          )}
        </div>
      </Card>
      )}

      {purchaseIntent === 'buy_now' && shippingMethod === 'delivery' && (
        <Card className={CHECKOUT_FORM_SECTION_CARD_CLASS} data-shipping-section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.shippingAddress')}</h2>
          {errors.shippingAddress || errors.shippingCity ? (
            <div
              className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
              role="alert"
            >
              <p className="text-sm font-medium text-red-600">
                {errors.shippingAddress?.message || errors.shippingCity?.message}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
          <Input
            label={t('checkout.form.address')}
            type="text"
            placeholder={t('checkout.placeholders.address')}
            checkoutChrome
            {...register('shippingAddress')}
            error={errors.shippingAddress?.message}
            disabled={isSubmitting}
          />
            </div>
            <div>
              <ShippingCitySelect
                register={register}
                value={shippingCity}
                error={errors.shippingCity?.message}
                disabled={isSubmitting}
                onAfterChange={() => setError(null)}
              />
            </div>
          </div>
        </Card>
      )}

      {purchaseIntent === 'buy_now' && (
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
                  setValue('paymentMethod', e.target.value as 'idram' | 'arca' | 'cash_on_delivery' | 'aparik', {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className={`mr-4 shrink-0 self-center ${CHECKOUT_RADIO_ACCENT_CLASS}`}
                disabled={isSubmitting}
              />
              {method.id === 'arca' ? (
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
                  <div className="min-w-0 w-full md:order-2 md:flex-1">
                    <div className="font-medium text-gray-900">{method.name}</div>
                    <div className="hidden text-sm leading-snug text-gray-600 md:block">
                      {method.description}
                    </div>
                  </div>
                  <div className="md:order-1">
                    <CheckoutPaymentMethodLogo
                      methodId={method.id}
                      logo={method.logo}
                      name={method.name}
                      logoErrors={logoErrors}
                      onLogoError={(methodId) => {
                        setLogoErrors((prev) => ({ ...prev, [methodId]: true }));
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <CheckoutPaymentMethodLogo
                    methodId={method.id}
                    logo={method.logo}
                    name={method.name}
                    logoErrors={logoErrors}
                    onLogoError={(methodId) => {
                      setLogoErrors((prev) => ({ ...prev, [methodId]: true }));
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{method.name}</div>
                    <div className="hidden text-sm leading-snug text-gray-600 md:block">{method.description}</div>
                  </div>
                </div>
              )}
            </label>
          ))}
        </div>
      </Card>
      )}

    </div>
  );
}
