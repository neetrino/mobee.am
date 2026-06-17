'use client';

import type { Ref, AnimationEvent } from 'react';
import { getStoredLanguage, setStoredLanguage, LANGUAGES, type LanguageCode } from '../lib/language';
import type { CurrencyCode } from '../lib/currency';
import { CURRENCIES } from '../lib/currency';
import { useTranslation } from '../lib/i18n-client';
import { MOBILE_HEADER_TOOLBAR_ICON_BUTTON_CLASS } from './header-strip-layout';
import { MobileHeaderToolbarGlobeIcon } from './icons/mobile-header-toolbar/MobileHeaderToolbarGlobeIcon';

const MOBILE_LOCALE_MENU_PANEL_CLASS =
  'absolute right-0 top-full z-[60] mt-2 w-[min(calc(100vw-2rem),8rem)] origin-top-right overflow-hidden rounded-2xl border border-gray-200 bg-white py-0 shadow-xl ring-1 ring-black/5';

const MOBILE_LOCALE_MENU_MOTION_IN_CLASS = 'animate-fade-in';
const MOBILE_LOCALE_MENU_MOTION_OUT_CLASS = 'animate-fade-out';

const MOBILE_LOCALE_MENU_SECTION_HEAD_CLASS =
  'border-b border-gray-100 bg-gray-50/80 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500';

const MOBILE_LOCALE_MENU_ROW_LANG =
  'w-full px-3 py-2.5 text-center text-sm transition-colors duration-150';

const MOBILE_LOCALE_MENU_ROW_CURRENCY =
  'flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm transition-colors duration-150';

function mobileLocaleMenuLangRowClass(active: boolean): string {
  if (active) {
    return `${MOBILE_LOCALE_MENU_ROW_LANG} bg-admin-50 font-semibold text-admin-800`;
  }
  return `${MOBILE_LOCALE_MENU_ROW_LANG} font-normal text-gray-800 hover:bg-admin-50/40`;
}

function mobileLocaleMenuCurrencyRowClass(active: boolean): string {
  if (active) {
    return `${MOBILE_LOCALE_MENU_ROW_CURRENCY} bg-admin-50 font-semibold text-admin-800`;
  }
  return `${MOBILE_LOCALE_MENU_ROW_CURRENCY} font-normal text-gray-800 hover:bg-admin-50/40`;
}

const MOBILE_PRIMARY_LANG_PILL_CODES: LanguageCode[] = ['hy', 'en', 'ru'];

type HeaderMobileLocaleControlProps = {
  containerRef: Ref<HTMLDivElement>;
  menuVisible: boolean;
  menuExiting: boolean;
  selectedCurrency: CurrencyCode;
  onToggle: () => void;
  onClose: () => void;
  onMenuAnimationEnd: (event: AnimationEvent<HTMLDivElement>) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  buttonClassName?: string;
};

export function HeaderMobileLocaleControl({
  containerRef,
  menuVisible,
  menuExiting,
  selectedCurrency,
  onToggle,
  onClose,
  onMenuAnimationEnd,
  onCurrencyChange,
  buttonClassName = MOBILE_HEADER_TOOLBAR_ICON_BUTTON_CLASS,
}: HeaderMobileLocaleControlProps) {
  const { t } = useTranslation();

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={buttonClassName}
        aria-label={t('common.ariaLabels.changeLanguageAndCurrency')}
        aria-expanded={menuVisible}
        aria-haspopup="dialog"
        aria-controls="header-mobile-locale-menu"
      >
        <MobileHeaderToolbarGlobeIcon size={22} className="shrink-0" />
      </button>
      {menuVisible ? (
        <div
          id="header-mobile-locale-menu"
          className={`${MOBILE_LOCALE_MENU_PANEL_CLASS} ${
            menuExiting ? MOBILE_LOCALE_MENU_MOTION_OUT_CLASS : MOBILE_LOCALE_MENU_MOTION_IN_CLASS
          }`}
          role="dialog"
          aria-label={t('common.ariaLabels.changeLanguageAndCurrency')}
          onAnimationEnd={onMenuAnimationEnd}
        >
          <div className={MOBILE_LOCALE_MENU_SECTION_HEAD_CLASS} id="header-mobile-locale-lang-heading">
            {t('common.localeMenu.languageSection')}
          </div>
          <div className="divide-y divide-gray-100" role="group" aria-labelledby="header-mobile-locale-lang-heading">
            {MOBILE_PRIMARY_LANG_PILL_CODES.map((code) => {
              const active = getStoredLanguage() === code;
              const label = LANGUAGES[code].nativeName;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (!active) {
                      setStoredLanguage(code);
                    }
                  }}
                  className={mobileLocaleMenuLangRowClass(active)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            className={`${MOBILE_LOCALE_MENU_SECTION_HEAD_CLASS} border-t border-gray-200`}
            id="header-mobile-locale-currency-heading"
          >
            {t('common.localeMenu.currencySection')}
          </div>
          <div className="divide-y divide-gray-100" role="group" aria-labelledby="header-mobile-locale-currency-heading">
            {Object.values(CURRENCIES).map((currency) => {
              const active = selectedCurrency === currency.code;
              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (!active) {
                      onCurrencyChange(currency.code);
                    }
                  }}
                  className={mobileLocaleMenuCurrencyRowClass(active)}
                >
                  <span>{currency.code}</span>
                  <span className={active ? 'text-admin-700' : 'text-gray-500'}>{currency.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
