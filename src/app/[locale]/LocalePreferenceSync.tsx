'use client';

import { useEffect } from 'react';
import { persistLanguagePreference, type LanguageCode } from '@/lib/language';

/** Keep cookie/localStorage aligned with the URL locale for API `?lang=` calls. */
export function LocalePreferenceSync({ locale }: { locale: LanguageCode }) {
  useEffect(() => {
    persistLanguagePreference(locale);
  }, [locale]);

  return null;
}
