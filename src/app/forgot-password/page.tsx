'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@shop/ui';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { apiClient, ApiError } from '../../lib/api-client';
import { AUTH_PAGE_CARD_CLASS, authFormClasses } from '../../lib/auth/authFormTailwind';
import { AuthPageBrandMark } from '../../components/AuthPageBrandMark';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.replace('/');
    }
  }, [isLoggedIn, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('login.forgotPasswordPage.errors.emailRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(
        '/api/v1/auth/forgot-password',
        { email: trimmed },
        { skipAuth: true }
      );
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('login.forgotPasswordPage.errors.requestFailed');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AuthPageBrandMark
        homeAriaLabel={t('common.navigation.home')}
        siteLogoAlt={t('common.ariaLabels.siteLogo')}
      />
      <Card className={AUTH_PAGE_CARD_CLASS}>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('login.forgotPasswordPage.title')}
        </h1>
        <p className="text-gray-600 mb-8">{t('login.forgotPasswordPage.subtitle')}</p>

        {success ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              {t('login.forgotPasswordPage.successMessage')}
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t('login.forgotPasswordPage.form.email')} *
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('login.form.emailPlaceholder')}
                  className={`w-full ${authFormClasses.input}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button
                variant="primary"
                type="submit"
                className={authFormClasses.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t('login.forgotPasswordPage.form.submitting')
                  : t('login.forgotPasswordPage.form.submit')}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6">
          <Link href="/login" className={authFormClasses.link}>
            {t('login.forgotPasswordPage.backToLogin')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
