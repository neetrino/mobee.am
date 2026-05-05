'use client';

import { useEffect, useState } from 'react';
import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../../../lib/language';

export const ADMIN_LANGUAGE_TABS: Array<{ code: LanguageCode; label: string }> = [
  { code: 'hy', label: 'hy' },
  { code: 'en', label: 'eng' },
  { code: 'ru', label: 'ru' },
];

export function useAdminSidebarLanguage(): LanguageCode {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    setCurrentLanguage(getStoredLanguage());
    const handleLanguageUpdate = () => {
      setCurrentLanguage(getStoredLanguage());
    };
    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, []);

  return currentLanguage;
}

interface LangPillProps {
  language: (typeof ADMIN_LANGUAGE_TABS)[number];
  currentLanguage: LanguageCode;
  layout: 'stack' | 'toolbar';
}

function homeButtonClasses(layout: 'stack' | 'toolbar', homeActive: boolean): string {
  if (layout === 'toolbar') {
    return `flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-all ${
      homeActive
        ? 'border-admin bg-admin text-white'
        : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:text-gray-900'
    }`;
  }
  return `flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
    homeActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  }`;
}

function LangPill({ language, currentLanguage, layout }: LangPillProps) {
  const isLangActive = currentLanguage === language.code;
  const widthClass = layout === 'stack' ? 'w-full' : 'min-w-[2.25rem] shrink-0 py-1';

  return (
    <button
      type="button"
      onClick={() => {
        if (!isLangActive) {
          setStoredLanguage(language.code);
        }
      }}
      className={`rounded-md border px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide transition-all ${widthClass} ${
        isLangActive
          ? 'border-admin bg-admin text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {language.label}
    </button>
  );
}

export interface AdminSidebarHomeLanguageBlockProps {
  homeTab: AdminMenuItem;
  currentPath: string;
  currentLanguage: LanguageCode;
  onGoHome: () => void;
  layout: 'stack' | 'toolbar';
}

export function AdminSidebarHomeLanguageBlock({
  homeTab,
  currentPath,
  currentLanguage,
  onGoHome,
  layout,
}: AdminSidebarHomeLanguageBlockProps) {
  const homeActive = currentPath === '/';
  const homeButton = (
    <button type="button" onClick={onGoHome} className={homeButtonClasses(layout, homeActive)}>
      <span className={`flex-shrink-0 ${homeActive ? 'text-white' : 'text-gray-500'}`}>{homeTab.icon}</span>
      <span className={layout === 'toolbar' ? 'hidden sm:inline' : ''}>{homeTab.label}</span>
    </button>
  );

  const langRow = ADMIN_LANGUAGE_TABS.map((language) => (
    <LangPill key={language.code} currentLanguage={currentLanguage} language={language} layout={layout} />
  ));

  if (layout === 'toolbar') {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {homeButton}
        <div className="flex gap-1">{langRow}</div>
      </div>
    );
  }

  return (
    <div className="mt-auto shrink-0 space-y-2 border-t border-gray-200 bg-white pt-3">
      {homeButton}
      <div className="grid grid-cols-3 gap-1">{langRow}</div>
    </div>
  );
}
