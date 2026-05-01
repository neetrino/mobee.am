'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, Button } from '@shop/ui';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { apiClient } from '../../../lib/api-client';
import { AdminPageShell } from '../components/AdminPageShell';
import { ADMIN_DISCOUNT_SAVE_BUTTON_CLASS } from '../constants/adminDiscountSaveButton.constants';

interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  createdAt: string;
}

interface PromoCodesResponse {
  data: PromoCode[];
}

interface PromoCodeCreatePayload {
  code: string;
  discountPercent: number;
}

export default function PromoCodesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('10');

  const fetchPromoCodes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<PromoCodesResponse>('/api/v1/admin/promocodes');
      setPromoCodes(response.data || []);
    } catch (error) {
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/admin');
    }
  }, [isAdmin, isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdmin) {
      fetchPromoCodes();
    }
  }, [fetchPromoCodes, isAdmin, isLoading, isLoggedIn]);

  const resetForm = () => {
    setCode('');
    setDiscountPercent('10');
  };

  const handleCreatePromoCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const parsedDiscount = Number(discountPercent);
    const isDiscountValid = parsedDiscount > 0 && parsedDiscount <= 100;

    if (!normalizedCode) {
      alert(t('admin.promocodes.codeRequired'));
      return;
    }

    if (!isDiscountValid) {
      alert(t('admin.promocodes.invalidDiscount'));
      return;
    }

    setSubmitting(true);
    try {
      const payload: PromoCodeCreatePayload = {
        code: normalizedCode,
        discountPercent: parsedDiscount,
      };

      await apiClient.post('/api/v1/admin/promocodes', payload);
      resetForm();
      await fetchPromoCodes();
      alert(t('admin.promocodes.createdSuccess'));
    } catch (error: unknown) {
      const typedError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const details = typedError.response?.data?.detail || typedError.message || t('admin.promocodes.unknownError');
      alert(t('admin.promocodes.errorCreate').replace('{message}', details));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (promoCodeId: string, currentStatus: boolean) => {
    setSubmitting(true);
    try {
      await apiClient.patch(`/api/v1/admin/promocodes/${promoCodeId}`, {
        isActive: !currentStatus,
      });
      await fetchPromoCodes();
    } catch (error: unknown) {
      const typedError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const details = typedError.response?.data?.detail || typedError.message || t('admin.promocodes.unknownError');
      alert(t('admin.promocodes.errorUpdate').replace('{message}', details));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromoCode = async (promoCodeId: string, promoCode: string) => {
    const confirmed = confirm(t('admin.promocodes.deleteConfirm').replace('{code}', promoCode));
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.delete(`/api/v1/admin/promocodes/${promoCodeId}`);
      await fetchPromoCodes();
      alert(t('admin.promocodes.deletedSuccess'));
    } catch (error: unknown) {
      const typedError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const details = typedError.response?.data?.detail || typedError.message || t('admin.promocodes.unknownError');
      alert(t('admin.promocodes.errorDelete').replace('{message}', details));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <AdminPageShell currentPath={pathname || '/admin/promocodes'} router={router} t={t}>
      <div className="max-w-7xl">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('admin.common.backToAdmin')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.promocodes.title')}</h1>
          <p className="text-gray-600 mt-2">{t('admin.promocodes.subtitle')}</p>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.promocodes.createTitle')}</h2>
            <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label htmlFor="promocode-code" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.promocodes.code')}
                </label>
                <input
                  id="promocode-code"
                  type="text"
                  value={code}
                  maxLength={64}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder={t('admin.promocodes.codePlaceholder')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-admin focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="promocode-discount" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.promocodes.discountPercent')}
                </label>
                <input
                  id="promocode-discount"
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-admin focus:border-transparent"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                variant="primary"
                className={`w-full md:w-auto ${ADMIN_DISCOUNT_SAVE_BUTTON_CLASS}`}
              >
                {submitting ? t('admin.promocodes.creating') : t('admin.promocodes.create')}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.promocodes.listTitle')}</h2>

            {loading ? (
              <p className="text-sm text-gray-600">{t('admin.promocodes.loading')}</p>
            ) : promoCodes.length === 0 ? (
              <p className="text-sm text-gray-600">{t('admin.promocodes.empty')}</p>
            ) : (
              <div className="space-y-3">
                {promoCodes.map((promoCode) => (
                  <div key={promoCode.id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{promoCode.code}</p>
                      <p className="text-sm text-gray-600">
                        {promoCode.discountPercent}% {t('admin.promocodes.discountLabel')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {promoCode.isActive ? t('admin.promocodes.active') : t('admin.promocodes.inactive')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                        onClick={() => handleToggleStatus(promoCode.id, promoCode.isActive)}
                      >
                        {promoCode.isActive ? t('admin.promocodes.deactivate') : t('admin.promocodes.activate')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() => handleDeletePromoCode(promoCode.id, promoCode.code)}
                        className="text-red-600 hover:text-red-700"
                      >
                        {t('admin.promocodes.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
