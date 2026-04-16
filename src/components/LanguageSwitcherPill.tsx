'use client';

import { useEffect, useState } from 'react';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../lib/language';

/**
 * EN / ՀԱՅ — matches Figma Component 5 (mobee-new Top Bar): sliding blue inset + border pill.
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
    <div className="relative h-[41px] w-[89px] shrink-0" role="group" aria-label="Language">
      <div className="pointer-events-none absolute inset-0 rounded-[22px] border-[1.2px] border-solid border-[#4b5563]" />
      <div
        className={`pointer-events-none absolute rounded-[18px] bg-[#136dec] transition-all duration-200 ease-out ${
          hySelected
            ? 'inset-[10.81%_5.62%_10.81%_50.56%]'
            : 'inset-[10.81%_50.56%_10.81%_5.62%]'
        }`}
      />
      <div className="relative z-10 flex h-full items-stretch px-0.5">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center rounded-[18px] text-[14px] font-medium leading-[15px] ${
            enSelected ? 'text-[#f5f5f5]' : 'text-[#4b5563]'
          }`}
          onClick={() => {
            if (lang !== 'en') setStoredLanguage('en');
          }}
        >
          EN
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center rounded-[18px] text-[14px] font-medium leading-[15px] ${
            hySelected ? 'text-[#f5f5f5]' : 'text-[#4b5563]'
          }`}
          onClick={() => {
            if (lang !== 'hy') setStoredLanguage('hy');
          }}
        >
          ՀԱՅ
        </button>
      </div>
    </div>
  );
}
