'use client';

import { Input } from '@shop/ui';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import { CheckoutFormData } from '../types';

interface ContactInformationProps {
  register: UseFormRegister<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
}

export function ContactInformation({
  register,
  errors,
  isSubmitting,
}: ContactInformationProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900">{t('checkout.contactInformation')}</h3>
      <div>
        <Input
          label={t('checkout.form.email')}
          type="email"
          {...register('email')}
          error={errors.email?.message}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Input
          label={t('checkout.form.phone')}
          type="tel"
          placeholder={t('checkout.placeholders.phone')}
          {...register('phone')}
          error={errors.phone?.message}
          disabled={isSubmitting}
        />
      </div>
      {(errors.email || errors.phone) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {errors.email?.message || errors.phone?.message}
          </p>
        </div>
      )}
    </div>
  );
}

