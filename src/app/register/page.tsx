'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@shop/ui';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { Eye, EyeOff } from 'lucide-react';
import {
  AUTH_PAGE_CARD_CLASS,
  AUTH_PAGE_HEADING_CLASS,
  AUTH_PAGE_OUTER_CLASS,
  AUTH_PAGE_SUBHEADING_CLASS,
  authFormClasses,
} from '../../lib/auth/authFormTailwind';
import { AuthPageBrandMark } from '../../components/AuthPageBrandMark';
import { FORM_INPUT_LATIN_LANG } from '../../lib/form-input-os.constants';

function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-500" aria-hidden="true">
      *
    </span>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, isLoading, isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.replace('/');
    }
  }, [isLoggedIn, isLoading, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!acceptTerms) {
      setError(t('register.errors.acceptTerms'));
      setIsSubmitting(false);
      return;
    }

    if (!firstName.trim()) {
      setError(t('register.errors.firstNameRequired'));
      setIsSubmitting(false);
      return;
    }

    if (!lastName.trim()) {
      setError(t('register.errors.lastNameRequired'));
      setIsSubmitting(false);
      return;
    }

    if (!email.trim()) {
      setError(t('register.errors.emailRequired'));
      setIsSubmitting(false);
      return;
    }

    if (!phone.trim()) {
      setError(t('register.errors.phoneRequired'));
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError(t('register.errors.passwordRequired'));
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError(t('register.errors.passwordMinLength'));
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.errors.passwordsDoNotMatch'));
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        email: email.trim(),
        phone: phone.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setTimeout(() => {
        if (window.location.pathname === '/register') {
          window.location.href = '/';
        }
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('register.errors.registrationFailed');
      setError(message || t('register.errors.registrationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={AUTH_PAGE_OUTER_CLASS}>
      <AuthPageBrandMark homeAriaLabel={t('common.navigation.home')} siteLogoAlt={t('common.ariaLabels.siteLogo')} />
      <Card className={AUTH_PAGE_CARD_CLASS}>
        <h1 className={AUTH_PAGE_HEADING_CLASS}>{t('register.title')}</h1>
        <p className={AUTH_PAGE_SUBHEADING_CLASS}>{t('register.subtitle')}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} lang={FORM_INPUT_LATIN_LANG} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.form.firstName')}
                <RequiredMark />
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder={t('register.placeholders.firstName')}
                className={`w-full ${authFormClasses.input}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting || isLoading}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.form.lastName')}
                <RequiredMark />
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder={t('register.placeholders.lastName')}
                className={`w-full ${authFormClasses.input}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting || isLoading}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.form.email')}
                <RequiredMark />
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('register.placeholders.email')}
                className={`w-full ${authFormClasses.input}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || isLoading}
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.form.phone')}
                <RequiredMark />
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('register.placeholders.phone')}
                className={`w-full ${authFormClasses.input}`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting || isLoading}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t('register.form.password')}
                <RequiredMark />
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('register.placeholders.password')}
                  className={`w-full pr-10 ${authFormClasses.input}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${authFormClasses.passwordToggle}`}
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('register.passwordHint')}
              </p>
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t('register.form.confirmPassword')}
                <RequiredMark />
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('register.placeholders.confirmPassword')}
                  className={`w-full pr-10 ${authFormClasses.input}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${authFormClasses.passwordToggle}`}
                  disabled={isSubmitting || isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (e.target.checked && error === t('register.errors.acceptTerms')) {
                  setError(null);
                }
              }}
              className={`mt-1 ${authFormClasses.checkbox}`}
              disabled={isSubmitting || isLoading}
              required
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
              {t('register.form.acceptTerms')}{' '}
              <Link href="/terms" className={authFormClasses.linkInline}>
                {t('register.form.termsOfService')}
              </Link>{' '}
              {t('register.form.and')}{' '}
              <Link href="/privacy" className={authFormClasses.linkInline}>
                {t('register.form.privacyPolicy')}
              </Link>
              <RequiredMark />
            </label>
          </div>
          {!acceptTerms && error === t('register.errors.acceptTerms') && (
            <p className="text-xs text-red-600 -mt-2">{t('register.errors.mustAcceptTerms')}</p>
          )}
          <Button
            variant="primary"
            className={authFormClasses.submitButton}
            type="submit"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? t('register.form.creatingAccount') : t('register.form.createAccount')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('register.form.alreadyHaveAccount')}{' '}
            <Link href="/login" className={authFormClasses.link}>
              {t('register.form.signIn')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
