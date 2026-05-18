'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@shop/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../lib/i18n-client';
import { apiClient, ApiError } from '../../lib/api-client';
import { AUTH_PAGE_CARD_CLASS, authFormClasses } from '../../lib/auth/authFormTailwind';
import { AuthPageBrandMark } from '../../components/AuthPageBrandMark';

function ResetPasswordContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams?.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(!!tokenFromUrl.trim());

  useEffect(() => {
    const raw = tokenFromUrl.trim();
    if (!raw) {
      setCheckingToken(false);
      setTokenValid(null);
      return;
    }

    let cancelled = false;
    setCheckingToken(true);
    apiClient
      .get<{ valid: boolean }>(
        `/api/v1/auth/validate-reset-token?token=${encodeURIComponent(raw)}`,
        { skipAuth: true }
      )
      .then((res) => {
        if (!cancelled) {
          setTokenValid(res.valid);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenValid(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingToken(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tokenFromUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = tokenFromUrl.trim();
    if (!token) {
      setError(t('login.resetPasswordPage.errors.tokenRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('login.resetPasswordPage.errors.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('login.resetPasswordPage.errors.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(
        '/api/v1/auth/reset-password',
        { token, newPassword },
        { skipAuth: true }
      );
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const detail =
        err instanceof ApiError &&
        err.data &&
        typeof err.data === 'object' &&
        'detail' in err.data
          ? String((err.data as { detail: string }).detail)
          : null;
      const message =
        detail ??
        (err instanceof ApiError
          ? err.message
          : t('login.resetPasswordPage.errors.resetFailed'));
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingToken && tokenFromUrl.trim()) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className={AUTH_PAGE_CARD_CLASS}>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </Card>
      </div>
    );
  }

  if (tokenFromUrl.trim() && tokenValid === false) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AuthPageBrandMark
          homeAriaLabel={t('common.navigation.home')}
          siteLogoAlt={t('common.ariaLabels.siteLogo')}
        />
        <Card className={AUTH_PAGE_CARD_CLASS}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('login.resetPasswordPage.linkExpiredTitle')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('login.resetPasswordPage.linkExpiredMessage')}
          </p>
          <Link href="/forgot-password" className={authFormClasses.link}>
            {t('login.resetPasswordPage.requestNewLink')}
          </Link>
          <div className="mt-4">
            <Link href="/login" className={authFormClasses.linkSm}>
              {t('login.resetPasswordPage.backToLogin')}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AuthPageBrandMark
          homeAriaLabel={t('common.navigation.home')}
          siteLogoAlt={t('common.ariaLabels.siteLogo')}
        />
        <Card className={AUTH_PAGE_CARD_CLASS}>
          <p className="text-green-800 mb-2">{t('login.resetPasswordPage.successMessage')}</p>
          <p className="text-sm text-gray-600 mb-6">
            {t('login.resetPasswordPage.redirecting')}
          </p>
          <Link href="/login" className={authFormClasses.link}>
            {t('login.resetPasswordPage.backToLogin')}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AuthPageBrandMark
        homeAriaLabel={t('common.navigation.home')}
        siteLogoAlt={t('common.ariaLabels.siteLogo')}
      />
      <Card className={AUTH_PAGE_CARD_CLASS}>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('login.resetPasswordPage.title')}
        </h1>
        <p className="text-gray-600 mb-8">{t('login.resetPasswordPage.subtitle')}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t('login.resetPasswordPage.form.newPassword')} *
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`w-full pr-10 ${authFormClasses.input}`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${authFormClasses.passwordToggle}`}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t('login.resetPasswordPage.form.confirmPassword')} *
            </label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`w-full ${authFormClasses.input}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
              minLength={6}
            />
          </div>
          <Button
            variant="primary"
            type="submit"
            className={authFormClasses.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('login.resetPasswordPage.form.submitting')
              : t('login.resetPasswordPage.form.submit')}
          </Button>
        </form>

        <div className="mt-6">
          <Link href="/login" className={authFormClasses.link}>
            {t('login.resetPasswordPage.backToLogin')}
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className={AUTH_PAGE_CARD_CLASS}>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </Card>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
