'use client';

import { Input } from '@shop/ui';
import type { AparikBankId } from '@/lib/aparik/banks.constants';
import { AparikBankPicker } from './AparikBankPicker';
import { AparikConsentToggles } from './AparikConsentToggles';
import {
  AparikDocumentsSection,
  type AparikSelectedDocument,
} from './AparikDocumentsSection';
import { AparikTermsBlock } from './AparikTermsBlock';

export interface InstallmentRequestFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface InstallmentRequestFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bankId?: string;
  documents?: string;
  consents?: string;
  submit?: string;
}

interface InstallmentRequestFormBodyProps {
  t: (key: string) => string;
  form: InstallmentRequestFormValues;
  errors: InstallmentRequestFormErrors;
  isSubmitting: boolean;
  bankId: AparikBankId | null;
  onBankSelect: (bankId: AparikBankId) => void;
  documents: AparikSelectedDocument[];
  onDocumentsChange: (documents: AparikSelectedDocument[]) => void;
  acceptedTerms: boolean;
  onTermsChange: (checked: boolean) => void;
  onFieldChange: (field: keyof InstallmentRequestFormValues, value: string) => void;
  onPhoneChange: (value: string) => void;
  phoneMaxLength: number;
}

export function InstallmentRequestFormBody({
  t,
  form,
  errors,
  isSubmitting,
  bankId,
  onBankSelect,
  documents,
  onDocumentsChange,
  acceptedTerms,
  onTermsChange,
  onFieldChange,
  onPhoneChange,
  phoneMaxLength,
}: InstallmentRequestFormBodyProps) {
  const documentTypeOptions = [
    {
      id: 'id_passport' as const,
      label: t('product.aparik.docTypes.idPassport'),
      icon: 'id' as const,
    },
    {
      id: 'id_social' as const,
      label: t('product.aparik.docTypes.idSocial'),
      icon: 'social' as const,
    },
    {
      id: 'selfie' as const,
      label: t('product.aparik.docTypes.selfie'),
      icon: 'selfie' as const,
    },
    {
      id: 'other' as const,
      label: t('product.aparik.docTypes.other'),
      icon: 'other' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <AparikBankPicker
        selectedBankId={bankId}
        onSelect={onBankSelect}
        disabled={isSubmitting}
        error={errors.bankId}
      />

      <AparikTermsBlock
        summary={t('product.aparik.termsSummary')}
        details={t('product.aparik.termsDetails')}
        hereLabel={t('product.aparik.termsHere')}
        seeMoreLabel={t('product.aparik.seeMore')}
        seeLessLabel={t('product.aparik.seeLess')}
      />

      <AparikDocumentsSection
        title={t('product.aparik.documentsTitle')}
        instructions={t('product.aparik.documentsInstructions')}
        artsakhNote={t('product.aparik.documentsArtsakhNote')}
        formatsHint={t('product.aparik.formatsHint')}
        clickHint={t('product.aparik.tileClickHint')}
        replaceHint={t('product.aparik.tileReplaceHint')}
        typeOptions={documentTypeOptions}
        documents={documents}
        onDocumentsChange={onDocumentsChange}
        disabled={isSubmitting}
        error={errors.documents}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="min-w-0" data-aparik-field="firstName">
          <Input
            name="firstName"
            label={t('checkout.form.firstName')}
            value={form.firstName}
            onChange={(event) => onFieldChange('firstName', event.target.value)}
            error={errors.firstName}
            hideErrorMessage
            disabled={isSubmitting}
            checkoutChrome
            required
          />
        </div>
        <div className="min-w-0" data-aparik-field="lastName">
          <Input
            name="lastName"
            label={t('checkout.form.lastName')}
            value={form.lastName}
            onChange={(event) => onFieldChange('lastName', event.target.value)}
            error={errors.lastName}
            hideErrorMessage
            disabled={isSubmitting}
            checkoutChrome
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="min-w-0" data-aparik-field="email">
          <Input
            name="email"
            label={t('checkout.form.email')}
            type="email"
            value={form.email}
            onChange={(event) => onFieldChange('email', event.target.value)}
            error={errors.email}
            hideErrorMessage
            disabled={isSubmitting}
            checkoutChrome
            required
          />
        </div>
        <div className="min-w-0" data-aparik-field="phone">
          <Input
            name="phone"
            label={t('checkout.form.phone')}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="+374 XX XXX XXX"
            value={form.phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            error={errors.phone}
            hideErrorMessage
            disabled={isSubmitting}
            maxLength={phoneMaxLength}
            checkoutChrome
            required
          />
        </div>
      </div>
      <AparikConsentToggles
        checked={acceptedTerms}
        onChange={onTermsChange}
        agreePrefix={t('product.aparik.consentAgreePrefix')}
        policyLabel={t('common.footer.policiesRow.credit')}
        disabled={isSubmitting}
        error={errors.consents}
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
    </div>
  );
}
