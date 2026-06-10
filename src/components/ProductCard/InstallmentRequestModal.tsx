'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { apiClient } from '../../lib/api-client';
import { isValidEmail } from '../../lib/utils/email';
import { FORM_INPUT_LATIN_LANG } from '../../lib/form-input-os.constants';
import type { CurrencyCode } from '../../lib/currency';

interface InstallmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productSlug: string;
  productTitle: string;
  productPrice: number;
  currency: CurrencyCode;
  productImageUrl?: string | null;
  color?: string;
  colorHex?: string;
  variantTitle?: string;
  sku?: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  submit?: string;
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
};

const PHONE_DIGITS_MIN = 8;
const PHONE_DIGITS_MAX = 15;

function sanitizePhoneDigits(value: string): string {
  let digits = '';
  for (const char of value) {
    if (char >= '0' && char <= '9') {
      digits += char;
    }
  }
  return digits.slice(0, PHONE_DIGITS_MAX);
}

function isValidPhoneDigits(phone: string): boolean {
  const trimmed = phone.trim();
  if (trimmed.length < PHONE_DIGITS_MIN || trimmed.length > PHONE_DIGITS_MAX) {
    return false;
  }
  for (const char of trimmed) {
    if (char < '0' || char > '9') {
      return false;
    }
  }
  return true;
}

function validateForm(values: FormState, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = t('checkout.errors.firstNameRequired');
  }
  if (!values.lastName.trim()) {
    errors.lastName = t('checkout.errors.lastNameRequired');
  }
  if (!values.email.trim()) {
    errors.email = t('checkout.errors.emailRequired');
  } else if (!isValidEmail(values.email)) {
    errors.email = t('checkout.errors.invalidEmail');
  }
  if (!values.phone.trim()) {
    errors.phone = t('checkout.errors.phoneRequired');
  } else if (!isValidPhoneDigits(values.phone)) {
    errors.phone = t('checkout.errors.invalidPhone');
  }

  return errors;
}

function InstallmentRequestSuccessView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start py-4">
      <div
        className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#e8f5e9]"
        aria-hidden
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="#2e7d32"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-left text-sm leading-relaxed text-gray-800">{message}</p>
    </div>
  );
}

export function InstallmentRequestModal({
  isOpen,
  onClose,
  productId,
  productSlug,
  productTitle,
  productPrice,
  currency,
  productImageUrl,
  color,
  colorHex,
  variantTitle,
  sku,
}: InstallmentRequestModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    setForm(EMPTY_FORM);
    setErrors({});
    setIsSuccess(false);
    onClose();
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
  };

  const handlePhoneChange = (value: string) => {
    handleFieldChange('phone', sanitizePhoneDigits(value));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validateForm(form, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await apiClient.post('/api/v1/aparik/inquiry', {
        productId,
        productSlug,
        productTitle,
        productPrice,
        currency,
        productImageUrl: productImageUrl ?? undefined,
        color: color?.trim() || undefined,
        colorHex: colorHex?.trim() || undefined,
        variantTitle: variantTitle?.trim() || undefined,
        sku: sku?.trim() || undefined,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setIsSuccess(true);
      setForm(EMPTY_FORM);
    } catch {
      setErrors({ submit: t('product.aparik.submitError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        lang={FORM_INPUT_LATIN_LANG}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        <div className="relative mb-6">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-0 top-0 shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600"
            aria-label={t('checkout.modals.closeModal')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {!isSuccess ? (
            <div className="pr-10 text-left">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {t('product.aparik.modalTitle')}
              </h2>
              <p className="text-sm leading-relaxed text-gray-700">
                {t('product.aparik.modalIntro')}
              </p>
            </div>
          ) : null}
        </div>

        {isSuccess ? (
          <InstallmentRequestSuccessView message={t('product.aparik.submitSuccess')} />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label={t('checkout.form.firstName')}
              value={form.firstName}
              onChange={(event) => handleFieldChange('firstName', event.target.value)}
              error={errors.firstName}
              disabled={isSubmitting}
              required
            />
            <Input
              label={t('checkout.form.lastName')}
              value={form.lastName}
              onChange={(event) => handleFieldChange('lastName', event.target.value)}
              error={errors.lastName}
              disabled={isSubmitting}
              required
            />
            <Input
              label={t('checkout.form.email')}
              type="email"
              value={form.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              error={errors.email}
              disabled={isSubmitting}
              required
            />
            <Input
              label={t('checkout.form.phone')}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="+374 XX XXX XXX"
              value={form.phone}
              onChange={(event) => handlePhoneChange(event.target.value)}
              error={errors.phone}
              disabled={isSubmitting}
              maxLength={PHONE_DIGITS_MAX}
              required
            />

            {errors.submit ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {errors.submit}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#2db2ff] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t('product.aparik.submitting') : t('common.buttons.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
