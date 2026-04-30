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
      className="relative h-[38.95px] w-[140.6px] shrink-0 rounded-[20.9px] border-[1.14px] border-solid border-[#4b5563]"
      role="group"
      aria-label="Language"
    >
      <div
        className="pointer-events-none absolute left-[3.8px] top-[3.8px] bottom-[3.8px] w-[calc((100%-7.6px)/3)] rounded-[17.1px] bg-[#2db2ff] transition-transform duration-200 ease-out"
        style={{ transform: slideTranslate }}
        aria-hidden
      />
      <div className="relative z-10 grid h-full grid-cols-3 items-stretch px-[1.9px]">
        <button
          type="button"
          className={`flex items-center justify-center rounded-[17.1px] text-[13.3px] font-bold leading-[14.25px] ${
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
          className={`flex items-center justify-center rounded-[17.1px] text-[13.3px] font-bold leading-[14.25px] ${
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
          className={`flex items-center justify-center rounded-[17.1px] text-[13.3px] font-bold leading-[14.25px] ${
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
