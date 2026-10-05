'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ADMIN_CONTENT_LOCALE_STORAGE_KEY,
  DEFAULT_ADMIN_CONTENT_LOCALE,
  parseAdminContentLocale,
  type AdminContentLocale,
} from '@/lib/admin/admin-content-locale';

/**
 * Persisted content-editing locale for admin catalog forms (independent of UI language).
 */
export function useAdminContentLocale(): {
  locale: AdminContentLocale;
  setLocale: (locale: AdminContentLocale) => void;
} {
  const [locale, setLocaleState] = useState<AdminContentLocale>(DEFAULT_ADMIN_CONTENT_LOCALE);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(ADMIN_CONTENT_LOCALE_STORAGE_KEY);
      setLocaleState(parseAdminContentLocale(stored));
    } catch {
      setLocaleState(DEFAULT_ADMIN_CONTENT_LOCALE);
    }
  }, []);

  const setLocale = useCallback((next: AdminContentLocale) => {
    setLocaleState(next);
    try {
      sessionStorage.setItem(ADMIN_CONTENT_LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, []);

  return { locale, setLocale };
}
