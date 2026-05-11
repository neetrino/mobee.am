'use client';

import type { ReactNode } from 'react';
import type { LanguageCode } from '../lib/language';
import { AuthProvider } from '../lib/auth/AuthContext';
import { CategoriesTreeProvider } from './CategoriesTreeContext';
import { ToastContainer } from './Toast';
import { UiLanguageProvider } from './UiLanguageProvider';

/**
 * ClientProviders component
 * Wraps the app with all client-side providers (Auth, Theme, etc.)
 */
export function ClientProviders({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
}) {
  return (
    <UiLanguageProvider initialLanguage={initialLanguage}>
      <AuthProvider>
        <CategoriesTreeProvider>{children}</CategoriesTreeProvider>
        <ToastContainer />
      </AuthProvider>
    </UiLanguageProvider>
  );
}
