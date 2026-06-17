'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Ref, FormEvent, AnimationEvent } from 'react';
import type { CurrencyCode } from '../lib/currency';
import { MOBILE_IOS_NO_FOCUS_ZOOM_INPUT_TEXT_CLASS } from '../lib/mobile-ios-input-font.constants';
import { HEADER_NAV_ICON_COUNT_OVERLAY_BADGE_CLASS } from './header-nav-count-badge.constants';
import { HeaderMobileLocaleControl } from './HeaderMobileLocaleControl';
import { SearchDropdown } from './SearchDropdown';
import { SiteBrandLogo } from './SiteBrandLogo';
import {
  MOBILE_HEADER_TOOLBAR_ICON_BUTTON_CLASS,
  SITE_CONTENT_GUTTERS_CLASS,
} from './header-strip-layout';
import { MobileHeaderToolbarCompareIcon } from './icons/mobile-header-toolbar/MobileHeaderToolbarCompareIcon';
import { MobileHeaderToolbarMenuIcon } from './icons/mobile-header-toolbar/MobileHeaderToolbarMenuIcon';
import type { InstantSearchResultItem } from './hooks/useInstantSearch';
import { useMobileHeaderSearchDock } from './useMobileHeaderSearchDock';
import { isCompareAppRoute } from '../lib/compareAppRoute';

type MobileHeaderToolbarProps = {
  t: (key: string) => string;
  compareCount: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: InstantSearchResultItem[];
  searchLoading: boolean;
  searchError: string | null;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: (open: boolean) => void;
  searchSelectedIndex: number;
  searchHandleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSearch: (event: FormEvent) => void;
  clearSearch: () => void;
  routerPush: (href: string) => void;
  showSearchModal: boolean;
  formRef: Ref<HTMLFormElement>;
  inputRef: Ref<HTMLInputElement>;
  localeContainerRef: Ref<HTMLDivElement>;
  localeMenuVisible: boolean;
  localeMenuExiting: boolean;
  selectedCurrency: CurrencyCode;
  onToggleLocaleMenu: () => void;
  onCloseLocaleMenu: () => void;
  onLocaleMenuAnimationEnd: (event: AnimationEvent<HTMLDivElement>) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onOpenMenu: () => void;
  mobileMenuOpen: boolean;
};

export function MobileHeaderToolbar({
  t,
  compareCount,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchLoading,
  searchError,
  searchDropdownOpen,
  setSearchDropdownOpen,
  searchSelectedIndex,
  searchHandleKeyDown,
  handleSearch,
  clearSearch,
  routerPush,
  showSearchModal,
  formRef,
  inputRef,
  localeContainerRef,
  localeMenuVisible,
  localeMenuExiting,
  selectedCurrency,
  onToggleLocaleMenu,
  onCloseLocaleMenu,
  onLocaleMenuAnimationEnd,
  onCurrencyChange,
  onOpenMenu,
  mobileMenuOpen,
}: MobileHeaderToolbarProps) {
  const pathname = usePathname();
  const isOnComparePage = isCompareAppRoute(pathname);

  const compareAria =
    compareCount > 0
      ? `${t('common.navigation.compare')} (${compareCount})`
      : t('common.navigation.compare');

  const { logoRowRef, searchWrapRef, searchDocked, logoCollapsed, flowSpacerPx } =
    useMobileHeaderSearchDock({
      searchQuery,
      searchDropdownOpen,
    });

  return (
    <div className="lg:hidden">
      <div
        ref={logoRowRef}
        className={`border-b border-gray-100 ${SITE_CONTENT_GUTTERS_CLASS} ${
          logoCollapsed
            ? 'pointer-events-none max-h-0 overflow-hidden border-b-0 py-0 opacity-0'
            : ''
        }`}
      >
        <div className="flex justify-center py-2.5">
          <Link
            href="/"
            className="flex max-w-[min(220px,48vw)] shrink-0 items-center justify-center transition-opacity active:opacity-90"
            aria-label={t('common.navigation.home')}
          >
            <SiteBrandLogo
              decorative
              alt={t('common.ariaLabels.siteLogo')}
              heightClass="h-8"
              priority
            />
          </Link>
        </div>
      </div>

      {flowSpacerPx > 0 ? (
        <div aria-hidden className="shrink-0" style={{ height: flowSpacerPx }} />
      ) : null}

      <div
        ref={searchWrapRef}
        className={`z-40 border-b border-gray-100 bg-white shadow-sm ${
          searchDocked ? 'fixed inset-x-0 top-0' : ''
        }`}
      >
        <div className={`flex items-center gap-2 py-2.5 ${SITE_CONTENT_GUTTERS_CLASS}`}>
          <form
            ref={formRef}
            onSubmit={handleSearch}
            className="relative min-w-0 flex-1"
            suppressHydrationWarning
          >
            <div className="flex h-11 min-w-0 items-center gap-3 rounded-[64px] bg-[#f7f7f7] px-3">
              <span className="inline-flex shrink-0 text-gray-500" aria-hidden>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="11" cy="11" r="7" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M20 20l-4.3-4.3" />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="search"
                name="header-mobile-search"
                suppressHydrationWarning
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (event.target.value.trim().length >= 1) {
                    setSearchDropdownOpen(true);
                  } else {
                    setSearchDropdownOpen(false);
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 1) {
                    setSearchDropdownOpen(true);
                  }
                }}
                onKeyDown={searchHandleKeyDown}
                placeholder={t('common.mainHeader.searchPlaceholder')}
                autoComplete="off"
                className={`min-w-0 flex-1 bg-transparent ${MOBILE_IOS_NO_FOCUS_ZOOM_INPUT_TEXT_CLASS} text-gray-900 outline-none placeholder:text-[#6b7280]`}
                aria-controls="header-mobile-search-results"
                aria-expanded={searchDropdownOpen && searchResults.length > 0}
                aria-autocomplete="list"
              />
            </div>
            {!showSearchModal ? (
              <SearchDropdown
                listboxId="header-mobile-search-results"
                results={searchResults}
                loading={searchLoading}
                error={searchError}
                isOpen={searchDropdownOpen}
                selectedIndex={searchSelectedIndex}
                query={searchQuery}
                onResultClick={(result) => {
                  routerPush(`/products/${result.slug}`);
                  clearSearch();
                  setSearchDropdownOpen(false);
                }}
                onClose={() => setSearchDropdownOpen(false)}
                className="mt-1"
              />
            ) : null}
          </form>

          <Link
            href="/compare"
            prefetch
            className={MOBILE_HEADER_TOOLBAR_ICON_BUTTON_CLASS}
            aria-label={compareAria}
            aria-current={isOnComparePage ? 'page' : undefined}
          >
            <MobileHeaderToolbarCompareIcon
              size={23}
              className={`shrink-0 ${isOnComparePage ? 'text-[#2db2ff]' : ''}`}
            />
            {compareCount > 0 ? (
              <span className={HEADER_NAV_ICON_COUNT_OVERLAY_BADGE_CLASS}>
                {compareCount > 99 ? '99+' : compareCount}
              </span>
            ) : null}
          </Link>

          <HeaderMobileLocaleControl
            containerRef={localeContainerRef}
            menuVisible={localeMenuVisible}
            menuExiting={localeMenuExiting}
            selectedCurrency={selectedCurrency}
            onToggle={onToggleLocaleMenu}
            onClose={onCloseLocaleMenu}
            onMenuAnimationEnd={onLocaleMenuAnimationEnd}
            onCurrencyChange={onCurrencyChange}
            buttonClassName={MOBILE_HEADER_TOOLBAR_ICON_BUTTON_CLASS}
          />

          <button
            type="button"
            onClick={onOpenMenu}
            className={MOBILE_HEADER_TOOLBAR_ICON_BUTTON_CLASS}
            aria-expanded={mobileMenuOpen}
            aria-label={t('common.ariaLabels.openMenu')}
          >
            <MobileHeaderToolbarMenuIcon size={44} className="shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use {@link MobileHeaderToolbar}. */
export const MobileHomeHeaderToolbar = MobileHeaderToolbar;
