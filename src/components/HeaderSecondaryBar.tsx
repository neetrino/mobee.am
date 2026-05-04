'use client';

import Link from 'next/link';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import { SearchDropdown } from './SearchDropdown';
import type { InstantSearchResultItem } from './hooks/useInstantSearch';
import {
  HEADER_PRIMARY_PEEK_TOP_MOTION_STYLE,
  SITE_CONTENT_GUTTERS_CLASS,
} from './header-strip-layout';
import { CompareIcon } from './icons/CompareIcon';
import { CartIcon } from './icons/CartIcon';
import { WishlistHeartIcon } from './icons/WishlistHeartIcon';

/** Trailing bar strokes — matches `CartIcon` (weight 2). */
const SECONDARY_BAR_ICON_STROKE_WIDTH = 2;

/** Menu lines for categories pill; single SVG so stroke weight matches on every line. */
function CategoriesMenuLinesIcon({ className }: { className?: string }) {
  const strokeWidth = SECONDARY_BAR_ICON_STROKE_WIDTH;
  return (
    <svg
      className={className}
      width={18}
      height={12}
      viewBox="0 0 18 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1={0} y1={2} x2={18} y2={2} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={0} y1={6} x2={18} y2={6} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={0} y1={10} x2={18} y2={10} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

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
        strokeWidth={SECONDARY_BAR_ICON_STROKE_WIDTH}
        fill="none"
      />
      <path
        d="M16 16L21 21"
        stroke="currentColor"
        strokeWidth={SECONDARY_BAR_ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
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
        strokeWidth={SECONDARY_BAR_ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20"
        stroke="currentColor"
        strokeWidth={SECONDARY_BAR_ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconLinkClass =
  'flex h-8 w-8 shrink-0 items-center justify-center text-[#4b5563] transition-colors hover:text-gray-900';

const PROFILE_MENU_ID = 'header-secondary-profile-menu';

function ProfileAccountMenu({
  profileLabel,
  profileAria,
  isAdmin,
  adminPanelLabel,
  logoutLabel,
  onLogout,
}: {
  profileLabel: string;
  profileAria: string;
  isAdmin: boolean;
  adminPanelLabel: string;
  logoutLabel: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocMouseDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-normal leading-normal text-gray-800 transition-colors hover:bg-gray-50';

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        id={`${PROFILE_MENU_ID}-trigger`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={PROFILE_MENU_ID}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md text-[#4b5563] transition-colors hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2db2ff]"
        aria-label={profileAria}
      >
        <UserOutlineIcon className="shrink-0" />
        <span className="whitespace-nowrap text-[13px] font-semibold leading-normal">{profileLabel}</span>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-500" aria-hidden>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open ? (
        <>
          <div className="absolute right-0 top-full z-[60] h-2 w-full min-w-[160px]" aria-hidden />
          <div
            id={PROFILE_MENU_ID}
            role="menu"
            aria-labelledby={`${PROFILE_MENU_ID}-trigger`}
            className="absolute right-0 top-full z-[60] min-w-[200px] pt-2"
          >
            <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white py-1 shadow-2xl">
              <Link href="/profile" role="menuitem" className={itemClass} onClick={close}>
                {profileLabel}
              </Link>
              {isAdmin ? (
                <Link href="/supersudo" role="menuitem" className={`${itemClass} text-blue-700 hover:bg-blue-50`} onClick={close}>
                  {adminPanelLabel}
                </Link>
              ) : null}
              <div className="my-1 border-t border-gray-100" role="separator" aria-orientation="horizontal" />
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  close();
                  onLogout();
                }}
              >
                {logoutLabel}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

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
  isAdmin: boolean;
  adminPanelLabel: string;
  logoutLabel: string;
  onLogout: () => void;
  /** When the global search modal is open, hide this dropdown so only one listbox is active. */
  suppressSearchDropdown: boolean;
  /**
   * Pins the bar to the viewport top with `position: fixed` (used when CSS sticky is unreliable
   * inside flex layouts). Parent renders a same-height flow spacer while this is true.
   */
  dockToViewportTop?: boolean;
  /**
   * When docked, shifts the fixed bar below another fixed strip (primary row revealed on scroll-up).
   */
  dockedViewportTopOffsetPx?: number;
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
      isAdmin,
      adminPanelLabel,
      logoutLabel,
      onLogout,
      suppressSearchDropdown,
      dockToViewportTop = false,
      dockedViewportTopOffsetPx = 0,
    },
    ref,
  ) {
    const topOffset = Math.max(0, Math.round(dockedViewportTopOffsetPx));
    const positionClass = dockToViewportTop ? 'fixed left-0 right-0 z-50' : 'relative z-50';
    const positionStyle: CSSProperties | undefined = dockToViewportTop
      ? { top: topOffset, ...HEADER_PRIMARY_PEEK_TOP_MOTION_STYLE }
      : undefined;

    return (
    <div
      ref={ref}
      className={`hidden w-full border-t border-b border-gray-200 bg-white lg:block ${positionClass} motion-reduce:transition-none ${montserratClassName}`}
      style={positionStyle}
    >
      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        <div className="flex items-center justify-between gap-3 py-2 lg:min-h-[52px]">
          <div className="flex min-w-0 flex-1 items-center gap-4 xl:gap-6">
            <div className="relative shrink-0" ref={categoriesWrapRef}>
              <button
                type="button"
                onClick={onCategoriesButtonClick}
                className="flex h-9 w-full min-w-[156px] max-w-[210px] items-center justify-between gap-1.5 rounded-[70px] bg-[#2db2ff] pl-4 pr-3 text-left text-white transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90 active:opacity-90"
                aria-expanded={isCategoriesMenuOpen}
                aria-haspopup="true"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <CategoriesMenuLinesIcon className="shrink-0 text-white" />
                  <span className="truncate text-[13px] font-bold leading-7">{categoriesLabel}</span>
                </span>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-white" aria-hidden>
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
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
                <CompareIcon
                  size={20}
                  strokeWidth={SECONDARY_BAR_ICON_STROKE_WIDTH}
                  className="shrink-0"
                />
                {compareCount > 0 ? (
                  <span className="sr-only">{compareCount}</span>
                ) : null}
              </Link>
              <Link href="/wishlist" className={iconLinkClass} aria-label={wishlistAria}>
                <WishlistHeartIcon size={20} strokeWidth={SECONDARY_BAR_ICON_STROKE_WIDTH} />
                {wishlistCount > 0 ? (
                  <span className="sr-only">{wishlistCount}</span>
                ) : null}
              </Link>
              <Link
                href="/cart"
                className={`${iconLinkClass} relative`}
                aria-label={cartAria}
                data-cart-fly-target="desktop"
              >
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
              <ProfileAccountMenu
                profileLabel={profileLabel}
                profileAria={profileAria}
                isAdmin={isAdmin}
                adminPanelLabel={adminPanelLabel}
                logoutLabel={logoutLabel}
                onLogout={onLogout}
              />
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
