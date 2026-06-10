'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { apiClient } from '../../lib/api-client';
import { isValidEmail } from '../../lib/utils/email';
import { FORM_INPUT_LATIN_LANG } from '../../lib/form-input-os.constants';
import { useAnimatedModalDismiss } from '../../lib/useAnimatedModalDismiss';
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

/** Above header, bottom nav, toasts, and other storefront overlays. */
const INSTALLMENT_MODAL_Z_INDEX_CLASS = 'z-[10000]' as const;

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
  const [isMounted, setIsMounted] = useState(false);

  const {
    isVisible,
    requestClose,
    handlePanelAnimationEnd,
    backdropMotionClass,
    panelMotionClass,
  } = useAnimatedModalDismiss({
    isOpen,
    onClose,
    blockClose: isSubmitting,
    lockBodyScroll: true,
    panelMotionVariant: 'sheet',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible) {
      return;
    }
    setForm(EMPTY_FORM);
    setErrors({});
    setIsSuccess(false);
  }, [isVisible]);

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

  if (!isVisible || !isMounted) {
    return null;
  }

  const modal = (
    <div
      className={`fixed inset-0 ${INSTALLMENT_MODAL_Z_INDEX_CLASS} flex flex-col justify-end sm:justify-center sm:p-4`}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropMotionClass}`}
        aria-label={t('checkout.modals.closeModal')}
        onClick={requestClose}
      />
      <div
        lang={FORM_INPUT_LATIN_LANG}
        role="dialog"
        aria-modal="true"
        aria-labelledby="installment-request-modal-title"
        className={`relative z-10 flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-2xl ${panelMotionClass}`}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
          {!isSuccess ? (
            <div className="min-w-0 pr-2 text-left">
              <h2
                id="installment-request-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                {t('product.aparik.modalTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                {t('product.aparik.modalIntro')}
              </p>
            </div>
          ) : (
            <h2 id="installment-request-modal-title" className="sr-only">
              {t('product.aparik.modalTitle')}
            </h2>
          )}
          <button
            type="button"
            onClick={requestClose}
            className="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            aria-label={t('checkout.modals.closeModal')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 sm:pb-6">
          {isSuccess ? (
            <InstallmentRequestSuccessView message={t('product.aparik.submitSuccess')} />
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <Input
                    label={t('checkout.form.firstName')}
                    value={form.firstName}
                    onChange={(event) => handleFieldChange('firstName', event.target.value)}
                    error={errors.firstName}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    label={t('checkout.form.lastName')}
                    value={form.lastName}
                    onChange={(event) => handleFieldChange('lastName', event.target.value)}
                    error={errors.lastName}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
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
    </div>
  );

  return createPortal(modal, document.body);
}
