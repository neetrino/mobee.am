'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Copy, Trash2 } from 'lucide-react';
import { Card, Button } from '@/app/admin/lib/adminShopUi';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { apiClient, ApiError } from '../../../lib/api-client';
import { AdminPageShell } from '../components/AdminPageShell';
import { showToast } from '../../../components/Toast';
import { confirmDialog } from '../../../components/ConfirmDialog';

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

/** Duration to show the “copied” checkmark after a successful clipboard write. */
const COPY_FEEDBACK_DURATION_MS = 2000;

/** Create-form fields — Mobee cyan focus, not admin navy ring. */
const PROMO_FORM_FIELD_CLASS =
  'w-full rounded-supersudo border border-gray-300 px-3 py-2 text-gray-900 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2DB2FF]/35' as const;

function getProblemDetail(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const problem = data as { detail?: unknown; message?: unknown };
  if (typeof problem.detail === 'string' && problem.detail.trim()) {
    return problem.detail;
  }
  if (typeof problem.message === 'string' && problem.message.trim()) {
    return problem.message;
  }
  return null;
}

function getErrorDetail(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return getProblemDetail(error.data) || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export default function PromoCodesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('10');
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleFlightRef = useRef<Set<string>>(new Set());

  const fetchPromoCodes = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? true;
    if (showLoader) {
      setLoading(true);
    }
    try {
      const response = await apiClient.get<PromoCodesResponse>('/api/v1/admin/promocodes');
      setPromoCodes(response.data || []);
    } catch {
      setPromoCodes([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/supersudo');
    }
  }, [isAdmin, isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdmin) {
      fetchPromoCodes();
    }
  }, [fetchPromoCodes, isAdmin, isLoading, isLoggedIn]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyPromoCode = async (promoCodeId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      if (copyFeedbackTimeoutRef.current !== null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      setCopiedCodeId(promoCodeId);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopiedCodeId(null);
        copyFeedbackTimeoutRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    } catch {
      showToast(t('admin.promocodes.copyFailed'), 'error');
    }
  };

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
      showToast(t('admin.promocodes.codeRequired'), 'warning');
      return;
    }

    if (!isDiscountValid) {
      showToast(t('admin.promocodes.invalidDiscount'), 'warning');
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
      await fetchPromoCodes({ showLoader: false });
      showToast(t('admin.promocodes.createdSuccess'), 'success');
    } catch (error: unknown) {
      const details = getErrorDetail(error, t('admin.promocodes.unknownError'));
      showToast(t('admin.promocodes.errorCreate').replace('{message}', details), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (promoCodeId: string, currentStatus: boolean) => {
    if (toggleFlightRef.current.has(promoCodeId)) {
      return;
    }
    const nextActive = !currentStatus;
    toggleFlightRef.current.add(promoCodeId);
    setStatusUpdatingId(promoCodeId);
    setPromoCodes((prev) =>
      prev.map((item) => (item.id === promoCodeId ? { ...item, isActive: nextActive } : item)),
    );
    try {
      await apiClient.patch(`/api/v1/admin/promocodes/${promoCodeId}`, {
        isActive: nextActive,
      });
    } catch (error: unknown) {
      setPromoCodes((prev) =>
        prev.map((item) =>
          item.id === promoCodeId ? { ...item, isActive: currentStatus } : item,
        ),
      );
      const details = getErrorDetail(error, t('admin.promocodes.unknownError'));
      showToast(t('admin.promocodes.errorUpdate').replace('{message}', details), 'error');
    } finally {
      toggleFlightRef.current.delete(promoCodeId);
      setStatusUpdatingId(null);
    }
  };

  const handleDeletePromoCode = async (promoCodeId: string, promoCode: string) => {
    const confirmed = await confirmDialog({
      message: t('admin.promocodes.deleteConfirm').replace('{code}', promoCode),
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.delete(`/api/v1/admin/promocodes/${promoCodeId}`);
      await fetchPromoCodes({ showLoader: false });
      showToast(t('admin.promocodes.deletedSuccess'), 'success');
    } catch (error: unknown) {
      const details = getErrorDetail(error, t('admin.promocodes.unknownError'));
      showToast(t('admin.promocodes.errorDelete').replace('{message}', details), 'error');
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
    <AdminPageShell currentPath={pathname || '/supersudo/promocodes'} router={router} t={t}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8">
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
                  className={PROMO_FORM_FIELD_CLASS}
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
                  className={PROMO_FORM_FIELD_CLASS}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                variant="admin"
                className="w-full md:w-auto"
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
                  <div key={promoCode.id} className="border border-gray-200 rounded-supersudo p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-base font-semibold text-gray-900">{promoCode.code}</p>
                        <button
                          type="button"
                          onClick={() => void handleCopyPromoCode(promoCode.id, promoCode.code)}
                          className="inline-flex shrink-0 items-center justify-center rounded-supersudo p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2DB2FF]/35 focus:ring-offset-1"
                          title={t('admin.promocodes.copyCode')}
                          aria-label={
                            copiedCodeId === promoCode.id
                              ? t('admin.promocodes.copied')
                              : t('admin.promocodes.copyCode')
                          }
                        >
                          {copiedCodeId === promoCode.id ? (
                            <Check className="h-4 w-4 text-green-600" aria-hidden />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {promoCode.discountPercent}% {t('admin.promocodes.discountLabel')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(promoCode.id, promoCode.isActive)}
                        disabled={submitting}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          statusUpdatingId === promoCode.id
                            ? 'pointer-events-none cursor-wait'
                            : ''
                        } ${
                          promoCode.isActive
                            ? 'bg-green-500 focus:ring-green-500'
                            : 'bg-gray-300 focus:ring-gray-400'
                        }`}
                        title={
                          promoCode.isActive
                            ? t('admin.promocodes.deactivate')
                            : t('admin.promocodes.activate')
                        }
                        role="switch"
                        aria-checked={promoCode.isActive}
                        aria-busy={statusUpdatingId === promoCode.id}
                        aria-label={`${promoCode.code}: ${
                          promoCode.isActive ? t('admin.promocodes.active') : t('admin.promocodes.inactive')
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-100 ease-out ${
                            promoCode.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        disabled={submitting || statusUpdatingId !== null}
                        onClick={() => handleDeletePromoCode(promoCode.id, promoCode.code)}
                        className="inline-flex shrink-0 items-center justify-center rounded-supersudo p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title={t('admin.promocodes.delete')}
                        aria-label={t('admin.promocodes.delete')}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
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
