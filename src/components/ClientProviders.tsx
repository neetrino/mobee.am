'use client';

import type { ReactNode } from 'react';
import type { LanguageCode } from '../lib/language';
import type { CategoryTreeNode } from '../lib/category-nav';
import { AuthProvider } from '../lib/auth/AuthContext';
import { CategoriesTreeProvider } from './CategoriesTreeContext';
import { TabletIpadAirLikeLayoutProvider } from './TabletIpadAirLikeLayoutProvider';
import { ConfirmDialogContainer } from './ConfirmDialog';
import { ToastContainer } from './Toast';
import { UiLanguageProvider } from './UiLanguageProvider';

/**
 * ClientProviders component
 * Wraps the app with all client-side providers (Auth, Theme, etc.)
 */
export function ClientProviders({
  children,
  initialLanguage,
  initialCategories,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
  initialCategories?: CategoryTreeNode[];
}) {
  return (
    <TabletIpadAirLikeLayoutProvider>
      <UiLanguageProvider initialLanguage={initialLanguage}>
        <AuthProvider>
          <CategoriesTreeProvider
            initialCategories={initialCategories}
            initialLanguage={initialLanguage}
          >
            {children}
          </CategoriesTreeProvider>
          <ToastContainer />
          <ConfirmDialogContainer />
        </AuthProvider>
      </UiLanguageProvider>
    </TabletIpadAirLikeLayoutProvider>
  );
}
