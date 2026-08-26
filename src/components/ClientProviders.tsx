'use client';

import type { ReactNode } from 'react';
import type { LanguageCode } from '../lib/language';
import { AuthProvider } from '../lib/auth/AuthContext';
import { TabletIpadAirLikeLayoutProvider } from './TabletIpadAirLikeLayoutProvider';
import { ConfirmDialogContainer } from './ConfirmDialog';
import { ToastContainer } from './Toast';
import { UiLanguageProvider } from './UiLanguageProvider';

/**
 * Root client providers. Storefront chrome and category tree live in `[locale]/layout`.
 */
export function ClientProviders({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
}) {
  return (
    <TabletIpadAirLikeLayoutProvider>
      <UiLanguageProvider initialLanguage={initialLanguage}>
        <AuthProvider>
          {children}
          <ToastContainer />
          <ConfirmDialogContainer />
        </AuthProvider>
      </UiLanguageProvider>
    </TabletIpadAirLikeLayoutProvider>
  );
}
