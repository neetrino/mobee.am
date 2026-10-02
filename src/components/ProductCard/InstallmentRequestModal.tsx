'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import type { AparikBankId } from '@/lib/aparik/banks.constants';
import { hasValidAparikDocumentSet } from '@/lib/aparik/document-rules';
import { useTranslation } from '../../lib/i18n-client';
import { isValidEmail } from '../../lib/utils/email';
import { FORM_INPUT_LATIN_LANG } from '../../lib/form-input-os.constants';
import { STOREFRONT_MODAL_TRANSITION_MS } from '../../lib/storefront-modal-motion.constants';
import type { CurrencyCode } from '../../lib/currency';
import type { AparikSelectedDocument } from './installment-request/AparikDocumentsSection';
import {
  APARIK_PHONE_DIGITS_MAX,
  isValidAparikPhoneDigits,
  sanitizeAparikPhoneDigits,
} from './installment-request/aparik-phone';
import {
  InstallmentRequestFormBody,
  type InstallmentRequestFormErrors,
  type InstallmentRequestFormValues,
} from './installment-request/InstallmentRequestFormBody';
import { scrollToFirstAparikFormError } from './installment-request/scroll-to-aparik-form-error';
import { InstallmentRequestSuccessView } from './installment-request/InstallmentRequestSuccessView';

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

const EMPTY_FORM: InstallmentRequestFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
};

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
  const [form, setForm] = useState<InstallmentRequestFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<InstallmentRequestFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bankId, setBankId] = useState<AparikBankId | null>(null);
  const [documents, setDocuments] = useState<AparikSelectedDocument[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setForm(EMPTY_FORM);
      setErrors({});
      setIsSuccess(false);
      setBankId(null);
      setDocuments([]);
      setAcceptedTerms(false);
    }, STOREFRONT_MODAL_TRANSITION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const handleFieldChange = (field: keyof InstallmentRequestFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
  };

  const validate = (): InstallmentRequestFormErrors => {
    const next: InstallmentRequestFormErrors = {};
    if (!form.firstName.trim()) {
      next.firstName = t('checkout.errors.firstNameRequired');
    }
    if (!form.lastName.trim()) {
      next.lastName = t('checkout.errors.lastNameRequired');
    }
    if (!form.email.trim()) {
      next.email = t('checkout.errors.emailRequired');
    } else if (!isValidEmail(form.email)) {
      next.email = t('checkout.errors.invalidEmail');
    }
    if (!form.phone.trim()) {
      next.phone = t('checkout.errors.phoneRequired');
    } else if (!isValidAparikPhoneDigits(form.phone)) {
      next.phone = t('checkout.errors.invalidPhone');
    }
    if (!bankId) {
      next.bankId = t('product.aparik.errors.bankRequired');
    }
    if (!hasValidAparikDocumentSet(documents.map((doc) => doc.type))) {
      next.documents = t('product.aparik.errors.documentsRequired');
    }
    if (!acceptedTerms) {
      next.consents = t('product.aparik.errors.consentsRequired');
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0 || !bankId) {
      setErrors(validationErrors);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToFirstAparikFormError(validationErrors);
        });
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const body = new FormData();
      body.append('productId', productId);
      body.append('productSlug', productSlug);
      body.append('productTitle', productTitle);
      body.append('productPrice', String(productPrice));
      body.append('currency', currency);
      if (productImageUrl?.trim()) {
        body.append('productImageUrl', productImageUrl.trim());
      }
      if (color?.trim()) {
        body.append('color', color.trim());
      }
      if (colorHex?.trim()) {
        body.append('colorHex', colorHex.trim());
      }
      if (variantTitle?.trim()) {
        body.append('variantTitle', variantTitle.trim());
      }
      if (sku?.trim()) {
        body.append('sku', sku.trim());
      }
      body.append('firstName', form.firstName.trim());
      body.append('lastName', form.lastName.trim());
      body.append('email', form.email.trim());
      body.append('phone', form.phone.trim());
      body.append('bankId', bankId);
      body.append('acceptedTerms', 'true');
      for (const doc of documents) {
        body.append('documents', doc.file);
        body.append('documentTypes', doc.type);
      }

      const response = await fetch('/api/v1/aparik/inquiry', {
        method: 'POST',
        body,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('submit_failed');
      }

      setIsSuccess(true);
      setForm(EMPTY_FORM);
      setDocuments([]);
      setBankId(null);
      setAcceptedTerms(false);
    } catch {
      setErrors({ submit: t('product.aparik.submitError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeAriaLabel={t('checkout.modals.closeModal')}
      panelMotionVariant="sheet"
      blockClose={isSubmitting}
      labelledBy="installment-request-modal-title"
      panelClassName="flex max-h-[min(92dvh,920px)] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:mx-auto sm:max-w-2xl sm:rounded-2xl"
      panelProps={{ lang: FORM_INPUT_LATIN_LANG }}
    >
      {({ requestClose }) => (
        <>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
            {!isSuccess ? (
              <h2
                id="installment-request-modal-title"
                className="min-w-0 pr-2 text-left text-lg font-semibold text-gray-900"
              >
                {t('product.aparik.modalTitle')}
              </h2>
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
              <form onSubmit={handleSubmit} noValidate>
                <InstallmentRequestFormBody
                  t={t}
                  form={form}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  bankId={bankId}
                  onBankSelect={(id) => {
                    setBankId(id);
                    setErrors((prev) => ({ ...prev, bankId: undefined, submit: undefined }));
                  }}
                  documents={documents}
                  onDocumentsChange={(next) => {
                    setDocuments(next);
                    setErrors((prev) => ({ ...prev, documents: undefined, submit: undefined }));
                  }}
                  acceptedTerms={acceptedTerms}
                  onTermsChange={(checked) => {
                    setAcceptedTerms(checked);
                    setErrors((prev) => ({ ...prev, consents: undefined, submit: undefined }));
                  }}
                  onFieldChange={handleFieldChange}
                  onPhoneChange={(value) =>
                    handleFieldChange('phone', sanitizeAparikPhoneDigits(value))
                  }
                  phoneMaxLength={APARIK_PHONE_DIGITS_MAX}
                />
              </form>
            )}
          </div>
        </>
      )}
    </AnimatedModalPortal>
  );
}
