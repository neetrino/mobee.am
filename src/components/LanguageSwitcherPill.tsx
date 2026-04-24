'use client';

import { useEffect, useState } from 'react';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../lib/language';

/**
 * ՀԱՅ / EN / РУС — Figma mobee-new Component 5 (node 178:544): bordered pill, #2db2ff sliding inset.
 */
type PillSegment = 'hy' | 'en' | 'ru';

function segmentForLang(lang: LanguageCode): PillSegment {
  if (lang === 'hy') return 'hy';
  if (lang === 'ru') return 'ru';
  return 'en';
}

export function LanguageSwitcherPill() {
  const [lang, setLang] = useState<LanguageCode>('en');

  useEffect(() => {
    setLang(getStoredLanguage());
    const onUpdate = () => setLang(getStoredLanguage());
    window.addEventListener('language-updated', onUpdate);
    return () => window.removeEventListener('language-updated', onUpdate);
  }, []);

  const seg = segmentForLang(lang);
  const slideTranslate =
    seg === 'hy' ? 'translateX(0%)' : seg === 'en' ? 'translateX(100%)' : 'translateX(200%)';

  return (
    <div
      className="relative h-[41px] w-[148px] shrink-0 rounded-[22px] border-[1.2px] border-solid border-[#4b5563]"
      role="group"
      aria-label="Language"
    >
      <div
        className="pointer-events-none absolute left-[4px] top-[4px] bottom-[4px] w-[calc((100%-8px)/3)] rounded-[18px] bg-[#2db2ff] transition-transform duration-200 ease-out"
        style={{ transform: slideTranslate }}
        aria-hidden
      />
      <div className="relative z-10 grid h-full grid-cols-3 items-stretch px-[2px]">
        <button
          type="button"
          className={`flex items-center justify-center rounded-[18px] text-[14px] font-bold leading-[15px] ${
            seg === 'hy' ? 'text-white' : 'text-[#4b5563]'
          }`}
          onClick={() => {
            if (lang !== 'hy') setStoredLanguage('hy');
          }}
        >
          ՀԱՅ
        </button>
        <button
          type="button"
          className={`flex items-center justify-center rounded-[18px] text-[14px] font-bold leading-[15px] ${
            seg === 'en' ? 'text-white' : 'text-[#4b5563]'
          }`}
          onClick={() => {
            if (lang !== 'en') setStoredLanguage('en');
          }}
        >
          EN
        </button>
        <button
          type="button"
          className={`flex items-center justify-center rounded-[18px] text-[14px] font-bold leading-[15px] ${
            seg === 'ru' ? 'text-white' : 'text-[#4b5563]'
          }`}
          onClick={() => {
            if (lang !== 'ru') setStoredLanguage('ru');
          }}
        >
          РУС
        </button>
      </div>
    </div>
  );
}
