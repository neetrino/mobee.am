'use client';

import { useEffect } from 'react';
import { persistLanguagePreference, type LanguageCode } from '@/lib/language';

/** Keep cookie/localStorage and `html lang` aligned with the URL locale. */
export function LocalePreferenceSync({ locale }: { locale: LanguageCode }) {
  useEffect(() => {
    persistLanguagePreference(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
