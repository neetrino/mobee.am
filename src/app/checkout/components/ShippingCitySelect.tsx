'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UseFormRegister } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import {
  ARMENIA_SUGGESTED_CITY_LABEL_SLUG,
  compareSuggestedArmeniaDeliveryCities,
} from '../../../lib/constants/armenia-delivery-cities.constants';
import { useDeliveryCities } from '../hooks/useDeliveryCities';
import type { CheckoutFormData } from '../types';
import {
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  CHECKOUT_SELECT_CHEVRON_CLASS,
  CHECKOUT_SELECT_OPTION_ACTIVE_CLASS,
  CHECKOUT_SELECT_OPTION_CLASS,
  CHECKOUT_SELECT_PANEL_CLASS,
  CHECKOUT_SELECT_TRIGGER_CLASS,
  CHECKOUT_SELECT_TRIGGER_FOCUS_CLASS,
} from '../constants';
interface ShippingCitySelectProps {
  register: UseFormRegister<CheckoutFormData>;
  value: string;
  error?: string;
  disabled?: boolean;
  onAfterChange?: () => void;
}

export function ShippingCitySelect({
  register,
  value,
  error,
  disabled,
  onAfterChange,
}: ShippingCitySelectProps) {
  const { t } = useTranslation();
  const { cities, loading } = useDeliveryCities();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const orderedCities = useMemo(
    () => [...cities].sort(compareSuggestedArmeniaDeliveryCities),
    [cities]
  );

  const registration = register('shippingCity', {
    onChange: () => {
      onAfterChange?.();
    },
  });

  const hiddenInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      registration.ref(element);
    },
    [registration]
  );

  const labelForCity = (city: string): string => {
    const slug = ARMENIA_SUGGESTED_CITY_LABEL_SLUG[city];
    return slug ? t(`checkout.shipping.suggestedCities.${slug}`) : city;
  };

  const displayLabel = value ? labelForCity(value) : '';
  const placeholder = loading
    ? t('checkout.shipping.loadingCities')
    : t('checkout.placeholders.selectCity');
  const isDisabled = disabled || loading;

  const pickCity = useCallback(
    (city: string) => {
      registration.onChange({
        target: { name: registration.name, value: city },
        type: 'change',
      });
      registration.onBlur({
        target: { name: registration.name, value: city },
        type: 'blur',
      });
      setIsOpen(false);
      onAfterChange?.();
    },
    [registration, onAfterChange]
  );

  const dismiss = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        dismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, dismiss]);

  const triggerBorderClass = error
    ? 'border-red-500 bg-red-50/50 focus-visible:ring-red-500/40'
    : isOpen
      ? 'border-admin-500 ring-2 ring-admin-500/25'
      : 'border-gray-300';

  return (
    <div className="w-full" ref={rootRef}>
      <label
        htmlFor="checkout-shipping-city-trigger"
        className={`mb-1 block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
      >
        {t('checkout.form.city')}
      </label>
      <input
        type="hidden"
        name="shippingCity"
        ref={hiddenInputRef}
        value={value}
        readOnly
      />
      <div className="relative">
        <button
          type="button"
          id="checkout-shipping-city-trigger"
          name="shippingCity"
          disabled={isDisabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls="checkout-shipping-city-listbox"
          aria-invalid={error ? true : undefined}
          className={`${CHECKOUT_SELECT_TRIGGER_CLASS} ${CHECKOUT_SELECT_TRIGGER_FOCUS_CLASS} ${triggerBorderClass}`}
          onClick={() => {
            if (!isDisabled) {
              setIsOpen((open) => !open);
            }
          }}
        >
          <span
            className={`min-w-0 flex-1 truncate ${displayLabel ? 'text-gray-900' : 'text-gray-500'}`}
          >
            {displayLabel || placeholder}
          </span>
          <span
            className={`${CHECKOUT_SELECT_CHEVRON_CLASS} ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            aria-hidden
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {isOpen && !isDisabled ? (
          <div
            id="checkout-shipping-city-listbox"
            role="listbox"
            aria-label={t('checkout.form.city')}
            className={CHECKOUT_SELECT_PANEL_CLASS}
          >
            {orderedCities.map((city) => {
              const active = city === value;
              return (
                <button
                  key={city}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`${CHECKOUT_SELECT_OPTION_CLASS} ${
                    active ? CHECKOUT_SELECT_OPTION_ACTIVE_CLASS : ''
                  }`}
                  onClick={() => pickCity(city)}
                >
                  {labelForCity(city)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className={`mt-1 text-sm font-medium text-red-600 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
