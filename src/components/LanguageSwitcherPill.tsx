'use client';

import { useEffect, useState } from 'react';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../lib/language';

/**
 * EN / ՀԱՅ segmented control matching Figma header (mobee-new Top Bar).
 */
export function LanguageSwitcherPill() {
  const [lang, setLang] = useState<LanguageCode>('en');

  useEffect(() => {
    setLang(getStoredLanguage());
    const onUpdate = () => setLang(getStoredLanguage());
    window.addEventListener('language-updated', onUpdate);
    return () => window.removeEventListener('language-updated', onUpdate);
  }, []);

  const enSelected = lang === 'en' || lang === 'ru' || lang === 'ka';
  const hySelected = lang === 'hy';

  return (
    <div
      className="relative h-[41px] w-[89px] shrink-0"
      role="group"
      aria-label="Language"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px] border-[1.2px] border-[#4b5563]"
        aria-hidden
      />
      <div className="flex h-full items-center justify-center gap-0 px-0.5">
        <button
          type="button"
          onClick={() => {
            if (lang !== 'en') setStoredLanguage('en');
          }}
          className={`relative z-10 flex h-[33px] min-w-0 flex-1 items-center justify-center rounded-[18px] text-[14px] font-medium leading-[15px] transition-colors ${
            enSelected ? 'bg-[#136dec] text-[#f5f5f5]' : 'bg-transparent text-[#4b5563]'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => {
            if (lang !== 'hy') setStoredLanguage('hy');
          }}
          className={`relative z-10 flex h-[33px] min-w-0 flex-1 items-center justify-center rounded-[18px] text-[14px] font-medium leading-[15px] transition-colors ${
            hySelected ? 'bg-[#136dec] text-[#f5f5f5]' : 'bg-transparent text-[#4b5563]'
          }`}
        >
          ՀԱՅ
        </button>
      </div>
    </div>
  );
}
