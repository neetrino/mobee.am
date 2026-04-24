'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import { SearchDropdown } from './SearchDropdown';
import type { InstantSearchResultItem } from './hooks/useInstantSearch';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { CompareIcon } from './icons/CompareIcon';
import { CartIcon } from './icons/CartIcon';
import { WishlistHeartIcon } from './icons/WishlistHeartIcon';

/** Search icon in pill (20px, secondary bar). */
function SecondarySearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z"
        stroke="currentColor"
        strokeWidth={2}
        fill="none"
      />
      <path d="M16 16L21 21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Outline user icon (20px, secondary bar). */
function UserOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconLinkClass =
  'flex h-8 w-8 shrink-0 items-center justify-center text-[#4b5563] transition-colors hover:text-gray-900';

export interface HeaderSecondaryBarProps {
  montserratClassName: string;
  categoriesWrapRef: RefObject<HTMLDivElement>;
  categoriesLabel: string;
  isCategoriesMenuOpen: boolean;
  onCategoriesButtonClick: () => void;
  categoriesMenu: ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
  searchInputRef: RefObject<HTMLInputElement>;
  onSearchFocus: () => void;
  searchResults: InstantSearchResultItem[];
  searchLoading: boolean;
  searchError: string | null;
  searchDropdownOpen: boolean;
  searchSelectedIndex: number;
  onSearchResultClick: (result: InstantSearchResultItem) => void;
  onSearchDropdownClose: () => void;
  onSearchSeeAllClick?: () => void;
  compareCount: number;
  wishlistCount: number;
  cartCount: number;
  isLoggedIn: boolean;
  loginLabel: string;
  profileLabel: string;
  compareAria: string;
  wishlistAria: string;
  cartAria: string;
  profileAria: string;
  /** When the global search modal is open, hide this dropdown so only one listbox is active. */
  suppressSearchDropdown: boolean;
  /**
   * Pins the bar to the viewport top with `position: fixed` (used when CSS sticky is unreliable
   * inside flex layouts). Parent renders a same-height flow spacer while this is true.
   */
  dockToViewportTop?: boolean;
}

const SECONDARY_SEARCH_LISTBOX_ID = 'header-secondary-search-results';

export const HeaderSecondaryBar = forwardRef<HTMLDivElement, HeaderSecondaryBarProps>(
  function HeaderSecondaryBar(
    {
      montserratClassName,
      categoriesWrapRef,
      categoriesLabel,
      isCategoriesMenuOpen,
      onCategoriesButtonClick,
      categoriesMenu,
      searchQuery,
      onSearchChange,
      onSearchSubmit,
      onSearchKeyDown,
      searchPlaceholder,
      searchInputRef,
      onSearchFocus,
      searchResults,
      searchLoading,
      searchError,
      searchDropdownOpen,
      searchSelectedIndex,
      onSearchResultClick,
      onSearchDropdownClose,
      onSearchSeeAllClick,
      compareCount,
      wishlistCount,
      cartCount,
      isLoggedIn,
      loginLabel,
      profileLabel,
      compareAria,
      wishlistAria,
      cartAria,
      profileAria,
      suppressSearchDropdown,
      dockToViewportTop = false,
    },
    ref,
  ) {
    const positionClass = dockToViewportTop
      ? 'fixed top-0 left-0 right-0 z-50'
      : 'relative z-50';

    return (
    <div
      ref={ref}
      className={`hidden w-full border-t border-b border-gray-200 bg-white lg:block ${positionClass} ${montserratClassName}`}
    >
      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        <div className="flex items-center justify-between gap-3 py-2 lg:min-h-[52px]">
          <div className="flex min-w-0 flex-1 items-center gap-4 xl:gap-6">
            <div className="relative shrink-0" ref={categoriesWrapRef}>
              <button
                type="button"
                onClick={onCategoriesButtonClick}
                className="flex h-9 w-full min-w-[156px] max-w-[210px] items-center justify-between gap-1.5 rounded-[70px] bg-[#2db2ff] pl-4 pr-3 text-left text-[#fcfcfc] shadow-sm transition-[filter] hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2db2ff]"
                aria-expanded={isCategoriesMenuOpen}
                aria-haspopup="true"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="flex h-3 w-[18px] shrink-0 flex-col justify-center gap-1" aria-hidden>
                    <span className="h-0.5 w-full rounded-full bg-white" />
                    <span className="h-0.5 w-full rounded-full bg-white" />
                    <span className="h-0.5 w-full rounded-full bg-white" />
                  </span>
                  <span className="truncate text-[13px] font-bold leading-7">{categoriesLabel}</span>
                </span>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="white"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              {categoriesMenu}
            </div>

            <div className="relative min-w-0 max-w-[299px] flex-1 xl:max-w-[374px]">
              <form onSubmit={onSearchSubmit} className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-2.5 z-[1] flex items-center">
                  <SecondarySearchGlyph className="text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="search"
                  name="header-secondary-search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={onSearchFocus}
                  onKeyDown={onSearchKeyDown}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className="h-9 w-full rounded-full border border-[#e5e7eb] bg-white/50 py-1.5 pl-10 pr-3 text-[13px] leading-normal text-gray-900 placeholder:text-[#6b7280] shadow-sm transition-shadow focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2db2ff]/25"
                  aria-controls={SECONDARY_SEARCH_LISTBOX_ID}
                  aria-expanded={searchDropdownOpen && searchResults.length > 0}
                  aria-autocomplete="list"
                />
                {!suppressSearchDropdown ? (
                  <SearchDropdown
                    listboxId={SECONDARY_SEARCH_LISTBOX_ID}
                    results={searchResults}
                    loading={searchLoading}
                    error={searchError}
                    isOpen={searchDropdownOpen}
                    selectedIndex={searchSelectedIndex}
                    query={searchQuery}
                    onResultClick={onSearchResultClick}
                    onClose={onSearchDropdownClose}
                    onSeeAllClick={onSearchSeeAllClick}
                    className="mt-1"
                  />
                ) : null}
              </form>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5 pl-1.5 xl:gap-7">
            <div className="flex items-center gap-0.5 sm:gap-1.5">
              <Link href="/compare" className={iconLinkClass} aria-label={compareAria}>
                <CompareIcon size={20} className="shrink-0" />
                {compareCount > 0 ? (
                  <span className="sr-only">{compareCount}</span>
                ) : null}
              </Link>
              <Link href="/wishlist" className={iconLinkClass} aria-label={wishlistAria}>
                <WishlistHeartIcon size={20} />
                {wishlistCount > 0 ? (
                  <span className="sr-only">{wishlistCount}</span>
                ) : null}
              </Link>
              <Link href="/cart" className={`${iconLinkClass} relative`} aria-label={cartAria}>
                <CartIcon size={18} className="shrink-0" />
                {cartCount > 0 ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2db2ff] px-0.5 text-[9px] font-normal leading-none text-white"
                    aria-hidden
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                ) : null}
              </Link>
            </div>

            {isLoggedIn ? (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 text-[#4b5563] transition-colors hover:text-gray-900"
                aria-label={profileAria}
              >
                <UserOutlineIcon className="shrink-0" />
                <span className="whitespace-nowrap text-[13px] font-normal leading-normal">{profileLabel}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 pr-0.5 text-[#4b5563] transition-colors hover:text-gray-900"
                aria-label={loginLabel}
              >
                <UserOutlineIcon className="shrink-0" />
                <span className="whitespace-nowrap text-[13px] font-normal leading-normal">{loginLabel}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  },
);
