'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@shop/ui';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { authFormClasses } from '../../lib/auth/authFormTailwind';
import { AuthPageBrandMark } from '../../components/AuthPageBrandMark';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.replace('/');
    }
  }, [isLoggedIn, isLoading, router]);

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AuthPageBrandMark
        homeAriaLabel={t('common.navigation.home')}
        siteLogoAlt={t('common.ariaLabels.siteLogo')}
      />
      <Card className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('login.forgotPasswordPage.title')}</h1>
        <p className="text-gray-600 mb-4">{t('login.forgotPasswordPage.subtitle')}</p>
        <p className="text-sm text-gray-600 mb-8">{t('login.forgotPasswordPage.body')}</p>
        <Link href="/login" className={authFormClasses.link}>
          {t('login.forgotPasswordPage.backToLogin')}
        </Link>
      </Card>
    </div>
  );
}
