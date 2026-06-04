'use client';

import { useMemo } from 'react';
import { UseFormRegister } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import {
  ARMENIA_SUGGESTED_CITY_LABEL_SLUG,
  compareSuggestedArmeniaDeliveryCities,
} from '../../../lib/constants/armenia-delivery-cities.constants';
import { useDeliveryCities } from '../hooks/useDeliveryCities';
import type { CheckoutFormData } from '../types';
import { FORM_INPUT_LATIN_LANG } from '../../../lib/form-input-os.constants';

const SELECT_CLASS =
  'w-full px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:cursor-default appearance-none bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10';

interface ShippingCitySelectProps {
  register: UseFormRegister<CheckoutFormData>;
  error?: string;
  disabled?: boolean;
  onAfterChange?: () => void;
}

export function ShippingCitySelect({ register, error, disabled, onAfterChange }: ShippingCitySelectProps) {
  const { t } = useTranslation();
  const { cities, loading } = useDeliveryCities();

  const orderedCities = useMemo(
    () => [...cities].sort(compareSuggestedArmeniaDeliveryCities),
    [cities]
  );

  const registration = register('shippingCity', {
    onChange: () => {
      onAfterChange?.();
    },
  });

  const labelForCity = (city: string): string => {
    const slug = ARMENIA_SUGGESTED_CITY_LABEL_SLUG[city];
    return slug ? t(`checkout.shipping.suggestedCities.${slug}`) : city;
  };

  return (
    <div className="w-full">
      <label
        htmlFor="checkout-shipping-city"
        className={`mb-1 block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
      >
        {t('checkout.form.city')}
      </label>
      <div className="relative">
        <select
          id="checkout-shipping-city"
          lang={FORM_INPUT_LATIN_LANG}
          {...registration}
          disabled={disabled || loading}
          aria-invalid={error ? true : undefined}
          className={`${SELECT_CLASS} ${
            error
              ? 'border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-red-500/40'
              : 'border-gray-300'
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
        >
          <option value="">
            {loading ? t('checkout.shipping.loadingCities') : t('checkout.placeholders.selectCity')}
          </option>
          {orderedCities.map((city) => (
            <option key={city} value={city}>
              {labelForCity(city)}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="mt-1 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
