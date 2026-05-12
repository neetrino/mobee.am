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

const SELECT_CLASS =
  'w-full px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10';

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
      <label htmlFor="checkout-shipping-city" className="block text-sm font-medium text-gray-700 mb-1">
        {t('checkout.form.city')}
      </label>
      <div className="relative">
        <select
          id="checkout-shipping-city"
          {...registration}
          disabled={disabled || loading}
          className={`${SELECT_CLASS} ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
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
      {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
