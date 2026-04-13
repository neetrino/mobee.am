'use client';

import { Input } from '@shop/ui';
import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCardNumber, formatCardExpiry, formatCardCvv } from '../utils/card-formatters';
import { CheckoutFormData } from '../types';

interface CardInputFieldsProps {
  register: UseFormRegister<CheckoutFormData>;
  setValue: UseFormSetValue<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  isSubmitting: boolean;
}

export function CardInputFields({
  register,
  setValue,
  errors,
  isSubmitting,
}: CardInputFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <Input
          label={t('checkout.form.cardNumber')}
          type="text"
          placeholder={t('checkout.placeholders.cardNumber')}
          maxLength={19}
          {...register('cardNumber')}
          error={errors.cardNumber?.message}
          disabled={isSubmitting}
          onChange={(e) => {
            const formatted = formatCardNumber(e.target.value);
            setValue('cardNumber', formatted);
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label={t('checkout.form.expiryDate')}
            type="text"
            placeholder={t('checkout.placeholders.expiryDate')}
            maxLength={5}
            {...register('cardExpiry')}
            error={errors.cardExpiry?.message}
            disabled={isSubmitting}
            onChange={(e) => {
              const formatted = formatCardExpiry(e.target.value);
              setValue('cardExpiry', formatted);
            }}
          />
        </div>
        <div>
          <Input
            label={t('checkout.form.cvv')}
            type="text"
            placeholder={t('checkout.placeholders.cvv')}
            maxLength={4}
            {...register('cardCvv')}
            error={errors.cardCvv?.message}
            disabled={isSubmitting}
            onChange={(e) => {
              const formatted = formatCardCvv(e.target.value);
              setValue('cardCvv', formatted);
            }}
          />
        </div>
      </div>
      <div>
        <Input
          label={t('checkout.form.cardHolderName')}
          type="text"
          placeholder={t('checkout.placeholders.cardHolderName')}
          {...register('cardHolderName')}
          error={errors.cardHolderName?.message}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
}

