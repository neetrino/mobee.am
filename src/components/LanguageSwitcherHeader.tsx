'use client';

import { useState, useEffect, useRef } from 'react';
import { LANGUAGES, type LanguageCode } from '../lib/language';
import { useSwitchStorefrontLocale } from '../lib/i18n/use-switch-locale';
import { localeSwitchIntentHandlers } from '../lib/i18n/prefetch-alternate-locales';
import { isAppLocale } from '../lib/i18n/routing';
import { LanguageFlagIcon } from './LanguageFlagIcon';

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Language colors for better visual distinction
const getLanguageColor = (code: LanguageCode, isActive: boolean): string => {
  if (isActive) {
    const colors: Record<LanguageCode, string> = {
      en: 'bg-blue-50 border-blue-200',
      hy: 'bg-orange-50 border-orange-200',
      ru: 'bg-red-50 border-red-200',
      ka: 'bg-gray-100 border-gray-200',
    };
    return colors[code] || 'bg-gray-100 border-gray-200';
  }
  return 'bg-white border-transparent';
};

/**
 * Language Switcher Component for Header
 * Uses only locales-based translations, no Google Translate
 */
export function LanguageSwitcherHeader() {
  const [showMenu, setShowMenu] = useState(false);
  const { switchLocale, prefetchLocale, displayLocale } = useSwitchStorefrontLocale();
  const currentLang = displayLocale;
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const changeLanguage = (langCode: LanguageCode) => {
    if (currentLang === langCode || !isAppLocale(langCode)) {
      setShowMenu(false);
      return;
    }
    setShowMenu(false);
    switchLocale(langCode);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        aria-expanded={showMenu}
        className="flex items-center gap-1 sm:gap-2 bg-transparent md:bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 transition-colors"
      >
        <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center text-base sm:text-lg leading-none">
          <LanguageFlagIcon code={currentLang} />
        </span>
        <span className="text-xs sm:text-sm font-medium">{LANGUAGES[currentLang].name}</span>
        <ChevronDownIcon />
      </button>
      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {Object.values(LANGUAGES)
            .filter((lang) => lang.code !== 'ka') // Exclude Georgian (ka) from header
            .map((lang) => {
            const isActive = currentLang === lang.code;
            const colorClass = getLanguageColor(lang.code, isActive);
            
            return (
              <button
                key={lang.code}
                {...(isAppLocale(lang.code) ? localeSwitchIntentHandlers(prefetchLocale, lang.code) : {})}
                onClick={() => changeLanguage(lang.code)}
                disabled={isActive}
                className={`w-full text-left px-4 py-3 text-sm transition-all duration-150 border-l-4 ${
                  isActive
                    ? `${colorClass} text-gray-900 font-semibold cursor-default`
                    : 'text-gray-700 hover:bg-gray-50 cursor-pointer border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0">
                    <LanguageFlagIcon code={lang.code} />
                  </span>
                  <div className="flex-1 flex items-center justify-between">
                    <span className={isActive ? 'font-semibold' : 'font-medium'}>
                      {lang.nativeName}
                    </span>
                    <span className={`text-xs ml-2 ${isActive ? 'text-gray-700 font-semibold' : 'text-gray-500'}`}>
                      {lang.code.toUpperCase()}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
