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

    console.log('🔐 [REGISTER PAGE] Form submitted');

    // Validation - check in order of importance
    console.log('🔍 [REGISTER PAGE] Validating form data...');
    console.log('🔍 [REGISTER PAGE] Form state:', {
      email: email.trim() || 'empty',
      phone: phone.trim() || 'empty',
      hasPassword: !!password,
      passwordLength: password.length,
      passwordsMatch: password === confirmPassword,
      acceptTerms,
    });

    if (!acceptTerms) {
      console.log('❌ [REGISTER PAGE] Validation failed: Terms not accepted');
      setError(t('register.errors.acceptTerms'));
      setIsSubmitting(false);
      return;
    }

    if (!email.trim() && !phone.trim()) {
      console.log('❌ [REGISTER PAGE] Validation failed: No email or phone');
      setError(t('register.errors.emailOrPhoneRequired'));
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      console.log('❌ [REGISTER PAGE] Validation failed: No password');
      setError(t('register.errors.passwordRequired'));
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      console.log('❌ [REGISTER PAGE] Validation failed: Password too short');
      setError(t('register.errors.passwordMinLength'));
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      console.log('❌ [REGISTER PAGE] Validation failed: Passwords do not match');
      setError(t('register.errors.passwordsDoNotMatch'));
      setIsSubmitting(false);
      return;
    }

    console.log('✅ [REGISTER PAGE] All validations passed');

    try {
      console.log('📤 [REGISTER PAGE] Calling register function...');
      console.log('📤 [REGISTER PAGE] Registration data:', {
        email: email.trim() || 'not provided',
        phone: phone.trim() || 'not provided',
        hasPassword: !!password,
        firstName: firstName.trim() || 'not provided',
        lastName: lastName.trim() || 'not provided',
      });
      
      await register({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      
      console.log('✅ [REGISTER PAGE] Registration successful, redirecting...');
      // Redirect is handled by AuthContext
      // But we can also redirect here as a fallback
      setTimeout(() => {
        if (window.location.pathname === '/register') {
          console.log('🔄 [REGISTER PAGE] Fallback redirect to home...');
          window.location.href = '/';
        }
      }, 1000);
    } catch (err: any) {
      console.error('❌ [REGISTER PAGE] Registration error:', err);
      console.error('❌ [REGISTER PAGE] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError(err.message || t('register.errors.registrationFailed'));
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.form.firstName')}
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder={t('register.placeholders.firstName')}
                className={`w-full ${authFormClasses.input}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting || isLoading}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.form.lastName')}
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder={t('register.placeholders.lastName')}
                className={`w-full ${authFormClasses.input}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting || isLoading}
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.form.email')}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t('register.placeholders.email')}
              className={`w-full ${authFormClasses.input}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isLoading}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.form.phone')}
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('register.placeholders.phone')}
              className={`w-full ${authFormClasses.input}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting || isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.form.password')}
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
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.form.confirmPassword')}
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
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                // Clear error when checkbox is checked
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

