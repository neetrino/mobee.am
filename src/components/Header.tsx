'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useLayoutEffect, useCallback, useRef, Suspense } from 'react';
import type { CSSProperties, FormEvent, RefObject } from 'react';
import { getStoredCurrency, setStoredCurrency, type CurrencyCode, CURRENCIES, initializeCurrencyRates, clearCurrencyRatesCache } from '../lib/currency';
import { useTranslation } from '../lib/i18n-client';
import { getStoredLanguage, setStoredLanguage, LANGUAGES, type LanguageCode } from '../lib/language';
import { useInstantSearch } from './hooks/useInstantSearch';
import { SearchDropdown } from './SearchDropdown';
import { useAuth } from '../lib/auth/AuthContext';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';
import { apiClient } from '../lib/api-client';
import { CART_KEY, getCompareCount, getWishlistCount } from '../lib/storageCounts';
import { LanguageSwitcherPill } from './LanguageSwitcherPill';
import { HEADER_FIGMA_ASSETS } from './header-figma-assets';
import {
  HEADER_PRIMARY_PEEK_HEIGHT_MOTION_STYLE,
  HEADER_PRIMARY_PEEK_STRIP_MOTION_STYLE,
  getDockedBarTopMotionStyle,
  HEADER_STRIP_MIN_HEIGHT_LG,
  HEADER_DESKTOP_BRAND_LOGO_HEIGHT_CLASS,
  HEADER_STRIP_PADDING_Y,
  MOBILE_PRIMARY_MENU_BAR_CLASS,
  MOBILE_PRIMARY_MENU_CLOSE_BAR_DIAGONAL_NEGATIVE_CLASS,
  MOBILE_PRIMARY_MENU_CLOSE_BAR_DIAGONAL_POSITIVE_CLASS,
  MOBILE_PRIMARY_MENU_CLOSE_ICON_WRAP_CLASS,
  MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS,
  MOBILE_PRIMARY_MENU_OPEN_BUTTON_CLASS,
  SITE_CONTENT_GUTTERS_CLASS,
} from './header-strip-layout';
import { SiteBrandLogo } from './SiteBrandLogo';
import { CompareIcon } from './icons/CompareIcon';
import { HeaderSecondaryBar } from './HeaderSecondaryBar';
import { HEADER_NAV_COUNT_INLINE_BADGE_CLASS } from './header-nav-count-badge.constants';
import { useCategoriesTree } from './CategoriesTreeContext';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../lib/layout-breakpoints.constants';
import {
  MOBILE_DRAWER_CTA_SOLID_ADMIN_CLASS,
  MOBILE_DRAWER_NAV_BUTTON_CLASS,
  MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS,
  MOBILE_DRAWER_PRIMARY_NAV_LINK_CLASS,
} from './mobile-drawer-nav.constants';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from '../lib/contactPhoneDisplay';

/** Desktop navbar strip only; drawer + contact + footer keep `contact.phone` i18n. */
const NAVBAR_SUPPORT_PHONE_DISPLAY = '055-81-11-81';

/** Handset glyph — horizontal nudge next to numbers (navbar + mobile drawer). */
const HEADER_SUPPORT_PHONE_ICON_OFFSET_CLASS = 'translate-x-[2px]';
/** Phone digits — slight right nudge relative to icon (navbar + mobile drawer). */
const HEADER_SUPPORT_PHONE_NUMBER_OFFSET_CLASS = 'translate-x-[3px]';

/** Any scroll-up past this delta shows the primary strip while search/secondary is docked. */
const PRIMARY_STRIP_SCROLL_UP_REVEAL_THRESHOLD_PX = 2;
/** Any scroll-down past this delta hides the peeking primary strip again. */
const PRIMARY_STRIP_SCROLL_DOWN_HIDE_THRESHOLD_PX = 2;

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '800', '900'],
  display: 'swap',
});

/** Right padding on pill so input clears the submit control (half-width overlap). */
const MOBILE_HOME_SEARCH_PILL_RIGHT_PAD_CLASS = 'pr-28';
/** Same height as pill (h-11); right edge flush with pill (absolute in wrapper). */
const MOBILE_HOME_SEARCH_SUBMIT_CLASS =
  'absolute right-0 top-1/2 z-10 flex h-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#2DB2FF] px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 active:opacity-90';

// Navigation links will be translated dynamically using useTranslation hook
const primaryNavLinks = [
  { href: '/', translationKey: 'common.navigation.home' },
  { href: '/shop', translationKey: 'common.navigation.products' },
  { href: '/about', translationKey: 'common.navigation.about' },
  { href: '/contact', translationKey: 'common.navigation.contact' },
];

interface Category {
  id: string;
  slug: string;
  title: string;
  fullPath: string;
  children: Category[];
}

/** Root categories pill dropdown: scroll container marker for submenu position sync. */
const CATEGORIES_ROOT_SCROLL_DATA_ATTR = 'data-categories-root-scroll';

const CATEGORY_SUBMENU_VIEWPORT_TOP_OFFSET_PX = -12;
const CATEGORY_SUBMENU_VIEWPORT_RIGHT_GUTTER_PX = 20;
const CATEGORY_SUBMENU_MAX_WIDTH_PX = 600;

function useCategoryMegaPanelPosition(
  open: boolean,
  menuItemRef: RefObject<HTMLDivElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const menuItemEl = menuItemRef.current;
    const panelEl = panelRef.current;
    if (!open || !menuItemEl || !panelEl) {
      return;
    }

    const updatePosition = () => {
      const menuItem = menuItemRef.current;
      if (!menuItem) {
        return;
      }
      const itemRect = menuItem.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const maxWidth = Math.min(
        CATEGORY_SUBMENU_MAX_WIDTH_PX,
        viewportWidth - itemRect.right - CATEGORY_SUBMENU_VIEWPORT_RIGHT_GUTTER_PX,
      );
      setStyle({
        position: 'fixed',
        left: `${itemRect.right}px`,
        top: `${itemRect.top + CATEGORY_SUBMENU_VIEWPORT_TOP_OFFSET_PX}px`,
        maxWidth: `${Math.max(0, maxWidth)}px`,
        zIndex: 60,
      });
    };

    updatePosition();

    const scrollRoot = menuItemEl.closest(`[${CATEGORIES_ROOT_SCROLL_DATA_ATTR}]`) ?? undefined;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    scrollRoot?.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      scrollRoot?.removeEventListener('scroll', updatePosition);
    };
  }, [open, menuItemRef, panelRef]);

  return style;
}

// Icon Components
// Arrow icon for categories with subcategories (▶)
const ArrowRightIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-auto">
    <path d="M3 2L5 4L3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** Globe stroke in 24×24 viewBox at 22px render: 2 * (24/22). */
const MOBILE_GLOBE_STROKE_USER_UNITS = (2 * 24) / 22;

/** Globe for mobile primary strip language control (inherits text color for strokes). */
const GlobeLanguageIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 text-black"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={MOBILE_GLOBE_STROKE_USER_UNITS} />
    <path
      d="M2 12h20"
      stroke="currentColor"
      strokeWidth={MOBILE_GLOBE_STROKE_USER_UNITS}
      strokeLinecap="round"
    />
    <path
      d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      stroke="currentColor"
      strokeWidth={MOBILE_GLOBE_STROKE_USER_UNITS}
    />
  </svg>
);

const MOBILE_PRIMARY_LANG_PILL_CODES: LanguageCode[] = ['hy', 'en', 'ru'];

const mobilePrimaryLangButtonClassName =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-black shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400';

/** Mobile locale flyout — white card (no outer gray frame). */
const MOBILE_LOCALE_MENU_PANEL_CLASS =
  'absolute right-0 top-full z-[60] mt-2 w-[min(calc(100vw-2rem),8rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white py-0 shadow-xl ring-1 ring-black/5';

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

/**
 * Component that syncs search params with state
 * Must be wrapped in Suspense because it uses useSearchParams()
 */
function HeaderSearchSync({
  setSearchQuery,
  setSelectedCategory,
  categories,
}: {
  setSearchQuery: (_query: string) => void;
  setSelectedCategory: (_category: Category | null) => void;
  categories: Category[];
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const searchParam = searchParams.get('search');
    const categoryParam = searchParams.get('category');
    setSearchQuery(searchParam || '');
    
    // Set selected category from URL
    if (categoryParam && categories.length > 0) {
      const flattenCategories = (cats: Category[]): Category[] => {
        const result: Category[] = [];
        cats.forEach((cat) => {
          result.push(cat);
          if (cat.children && cat.children.length > 0) {
            result.push(...flattenCategories(cat.children));
          }
        });
        return result;
      };
      const allCategories = flattenCategories(categories);
      const slugs = categoryParam.split(',').map((s) => s.trim()).filter(Boolean);
      const firstSlug = slugs[0];
      const foundCategory = firstSlug
        ? allCategories.find((cat) => cat.slug === firstSlug)
        : null;
      setSelectedCategory(foundCategory || null);
    } else {
      setSelectedCategory(null);
    }
  }, [searchParams, categories, setSearchQuery, setSelectedCategory]);

  return null;
}

/**
 * Category Menu Item Component with nested submenu support
 * Displays subcategories in a multi-column layout; mega-panel uses fixed positioning
 * so it stays visible when the root categories list scrolls.
 */
function CategoryMenuItem({ 
  category, 
  onClose 
}: { 
  category: Category; 
  onClose: () => void;
}) {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const submenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const menuItemRef = useRef<HTMLDivElement>(null);
  const submenuStyle = useCategoryMegaPanelPosition(showSubmenu, menuItemRef, submenuRef);
  const hasChildren = category.children && category.children.length > 0;

  const handleMouseEnter = () => {
    if (hasChildren) {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
        submenuTimeoutRef.current = null;
      }
      setShowSubmenu(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasChildren) {
      submenuTimeoutRef.current = setTimeout(() => {
        setShowSubmenu(false);
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  // Organize subcategories into columns (4 columns max)
  // Distributes items evenly across columns
  const organizeIntoColumns = (items: Category[], columnsCount: number = 4) => {
    if (items.length === 0) return [];
    
    // Calculate optimal number of columns based on items count
    const optimalColumns = Math.min(columnsCount, Math.ceil(items.length / 8));
    const itemsPerColumn = Math.ceil(items.length / optimalColumns);
    const columns: Category[][] = [];
    
    for (let i = 0; i < optimalColumns; i++) {
      const start = i * itemsPerColumn;
      const end = start + itemsPerColumn;
      const column = items.slice(start, end);
      if (column.length > 0) {
        columns.push(column);
      }
    }
    
    return columns;
  };

  const subcategoryColumns = hasChildren 
    ? organizeIntoColumns(category.children, 4)
    : [];

  return (
    <div 
      ref={menuItemRef}
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/shop?category=${category.slug}`}
        className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-150"
        onClick={onClose}
      >
        <span>{category.title}</span>
        {hasChildren && (
          <ArrowRightIcon />
        )}
      </Link>
      {hasChildren && showSubmenu && (
        <div 
          ref={submenuRef}
          className="z-[60]"
          style={submenuStyle}
          onMouseEnter={() => {
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
              submenuTimeoutRef.current = null;
            }
            setShowSubmenu(true);
          }}
          onMouseLeave={() => {
            submenuTimeoutRef.current = setTimeout(() => {
              setShowSubmenu(false);
            }, 150);
          }}
        >
          <div className="w-max max-w-[min(500px,calc(100vw-2rem))] rounded-xl border border-gray-200/80 bg-white p-6 shadow-2xl">
            <div 
              className="grid gap-6"
              style={{ gridTemplateColumns: `repeat(${subcategoryColumns.length}, minmax(150px, 1fr))` }}
            >
              {subcategoryColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="flex flex-col">
                  <div className="mb-4 pb-2 border-b border-gray-200">
                    <Link
                      href={`/shop?category=${category.slug}`}
                      className="text-sm font-bold text-gray-900 hover:text-gray-700 uppercase tracking-wide"
                      onClick={onClose}
                    >
                      {category.title}
                    </Link>
                  </div>
                  <div className="space-y-2.5">
                    {column.map((subCategory) => (
                      <Link
                        key={subCategory.id}
                        href={`/shop?category=${subCategory.slug}`}
                        className="block text-sm text-gray-700 hover:text-gray-900 transition-colors duration-150 py-1"
                        onClick={onClose}
                      >
                        {subCategory.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Root categories dropdown (desktop secondary bar). */
function CategoriesMenuFlyout({
  loading,
  roots,
  onItemNavigate,
  loadingLabel,
}: {
  loading: boolean;
  roots: Category[];
  onItemNavigate: () => void;
  loadingLabel: string;
}) {
  return (
    <>
      <div className="absolute left-0 top-full z-[55] h-2 w-full" aria-hidden />
      <div className="absolute left-0 top-full z-[55] w-64 max-w-[min(16rem,calc(100vw-2rem))] pt-2">
        <div
          {...{ [CATEGORIES_ROOT_SCROLL_DATA_ATTR]: true }}
          className="max-h-96 overflow-y-auto overscroll-y-contain rounded-xl border border-gray-200/80 bg-white shadow-2xl [scrollbar-gutter:stable]"
        >
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">{loadingLabel}</div>
          ) : (
            roots.map((category) => (
              <CategoryMenuItem
                key={category.id}
                category={category}
                onClose={onItemNavigate}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

/** Figma mobee-new — support phone (icon node 178:537) + optional language pill */
function HeaderPhoneLangCluster({
  phoneNumberVisibility,
  showLanguageSwitcher = true,
}: {
  phoneNumberVisibility?: 'always' | 'smUp';
  showLanguageSwitcher?: boolean;
}) {
  const { t } = useTranslation();
  const phoneLines = splitContactPhoneDisplay(NAVBAR_SUPPORT_PHONE_DISPLAY);

  const numberWrapperClass =
    phoneNumberVisibility === 'smUp'
      ? 'hidden min-w-0 flex-col gap-0.5 sm:flex'
      : 'flex min-w-0 flex-col gap-0.5';

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-3 lg:gap-4 xl:gap-8 2xl:gap-[50px]">
      <div
        className="flex min-w-0 items-center gap-2"
        role="group"
        aria-label={t('common.header.supportPhoneAria')}
      >
        <span className={`relative size-6 shrink-0 ${HEADER_SUPPORT_PHONE_ICON_OFFSET_CLASS}`}>
          <img
            src={HEADER_FIGMA_ASSETS.phoneIcon}
            alt=""
            width={24}
            height={24}
            className="absolute inset-0 block size-6 max-w-none"
          />
        </span>
        <span
          className={`${numberWrapperClass} ${HEADER_SUPPORT_PHONE_NUMBER_OFFSET_CLASS} text-[14px] font-semibold leading-6 tracking-[0.2px] text-[#374151] tabular-nums`}
        >
          {phoneLines.map((line, index) => (
            <a key={`${line}-${index}`} href={phoneDisplayToTelHref(line)} className="block hover:underline">
              {line}
            </a>
          ))}
        </span>
      </div>
      {showLanguageSwitcher ? <LanguageSwitcherPill /> : null}
    </div>
  );
}

/** Support numbers in mobile drawer — one tappable row per line from `contact.phone`, each with its own handset icon. */
function MobileDrawerSupportPhoneButtons() {
  const { t } = useTranslation();
  const phoneLines = splitContactPhoneDisplay(t('contact.phone'));

  return (
    <>
      {phoneLines.map((line) => (
        <a
          key={line}
          href={phoneDisplayToTelHref(line)}
          className={`${MOBILE_DRAWER_NAV_BUTTON_CLASS} normal-case text-gray-800`}
          aria-label={`${t('common.header.supportPhoneAria')}: ${line}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`relative size-6 shrink-0 ${HEADER_SUPPORT_PHONE_ICON_OFFSET_CLASS}`}>
              <img
                src={HEADER_FIGMA_ASSETS.phoneIcon}
                alt=""
                width={24}
                height={24}
                className="absolute inset-0 block size-6 max-w-none"
              />
            </span>
            <span
              className={`min-w-0 text-sm font-semibold tabular-nums text-[#374151] ${HEADER_SUPPORT_PHONE_NUMBER_OFFSET_CLASS}`}
            >
              {line}
            </span>
          </span>
        </a>
      ))}
    </>
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, logout, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [compareCount, setCompareCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [, setCartTotal] = useState(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const showSearchModalRef = useRef(false);
  showSearchModalRef.current = showSearchModal;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('AMD');
  const { categories, loadingCategories } = useCategoriesTree();
  const [, setSelectedCategory] = useState<Category | null>(null);
  const currentYear = new Date().getFullYear();

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/shop') return pathname.startsWith('/shop') || pathname.startsWith('/products');
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navTextClass = (href: string) =>
    isNavActive(href)
      ? 'whitespace-nowrap text-[13px] font-black leading-5 tracking-[0.2px] text-[#00a1ff] xl:text-[14px]'
      : 'whitespace-nowrap text-[13px] font-semibold leading-5 tracking-[0.2px] text-[#374151] transition-colors duration-150 hover:text-[#00a1ff] xl:text-[14px]';

  const searchModalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  /** Desktop secondary row: search input + instant listbox (outside-click target). */
  const desktopSecondarySearchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownOpenRef = useRef(false);
  const mobileHomeSearchFormRef = useRef<HTMLFormElement>(null);
  const mobileHomeSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileStrip1WrapRef = useRef<HTMLDivElement>(null);
  const mobileStrip1Ref = useRef<HTMLDivElement>(null);
  const desktopPrimaryWrapRef = useRef<HTMLDivElement>(null);
  const desktopPrimaryRowRef = useRef<HTMLDivElement>(null);
  const mobileSearchWrapRef = useRef<HTMLDivElement>(null);
  const categoriesPillWrapRef = useRef<HTMLDivElement>(null);
  const mobilePrimaryLangRef = useRef<HTMLDivElement>(null);
  const primaryStripRef = useRef<HTMLElement | null>(null);
  const secondaryBarOuterRef = useRef<HTMLDivElement | null>(null);
  /** Latest header search text for scroll-dock logic (refs avoid stale closures in scroll handlers). */
  const searchQueryForDockRef = useRef('');
  const [secondaryDocked, setSecondaryDocked] = useState(false);
  const [secondaryBarHeightPx, setSecondaryBarHeightPx] = useState(0);
  const [mobileSearchDocked, setMobileSearchDocked] = useState(false);
  const [mobileSearchFlowSpacerPx, setMobileSearchFlowSpacerPx] = useState(0);
  const [primaryBarPeekFromScrollUp, setPrimaryBarPeekFromScrollUp] = useState(false);
  const [mobileStrip1HeightPx, setMobileStrip1HeightPx] = useState(0);
  const [desktopPrimaryBarHeightPx, setDesktopPrimaryBarHeightPx] = useState(0);
  const lastScrollYRef = useRef(0);
  const prevMobileSearchDockedRef = useRef<boolean | null>(null);
  const [mobileStripPeekSlideIn, setMobileStripPeekSlideIn] = useState(false);
  const [desktopPrimaryPeekSlideIn, setDesktopPrimaryPeekSlideIn] = useState(false);
  const [headerLayoutReady, setHeaderLayoutReady] = useState(false);
  const [showCategoriesPillMenu, setShowCategoriesPillMenu] = useState(false);
  const [showMobilePrimaryLangMenu, setShowMobilePrimaryLangMenu] = useState(false);

  const syncSecondaryDock = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    if (!mq.matches) {
      setSecondaryDocked(false);
      return;
    }
    const secondaryEl = secondaryBarOuterRef.current;
    if (secondaryEl) {
      const h = secondaryEl.offsetHeight;
      if (h > 0) {
        setSecondaryBarHeightPx(h);
      }
    }
    const primaryEl = primaryStripRef.current;
    if (!primaryEl) {
      return;
    }
    const primaryScrolledPast = primaryEl.getBoundingClientRect().bottom <= 0;
    const blockDockForSearchUi =
      searchQueryForDockRef.current.trim().length > 0 || searchDropdownOpenRef.current;
    setSecondaryDocked(primaryScrolledPast && !blockDockForSearchUi);
  }, []);

  const syncMobileSearchDock = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY).matches) {
      setMobileSearchDocked(false);
      setMobileSearchFlowSpacerPx(0);
      return;
    }
    const strip1Wrap = mobileStrip1WrapRef.current;
    const searchWrap = mobileSearchWrapRef.current;
    if (searchWrap) {
      const h = Math.round(searchWrap.getBoundingClientRect().height);
      if (h > 0) {
        setMobileSearchFlowSpacerPx(h);
      }
    }
    if (!strip1Wrap) {
      return;
    }
    const stripScrolledPast = strip1Wrap.getBoundingClientRect().bottom <= 0;
    const blockDockForSearchUi =
      searchQueryForDockRef.current.trim().length > 0 || searchDropdownOpenRef.current;
    setMobileSearchDocked(stripScrolledPast && !blockDockForSearchUi);
  }, []);

  useLayoutEffect(() => {
    const stripInner = mobileStrip1Ref.current;
    const desktopInner = desktopPrimaryRowRef.current;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => {
      if (stripInner) {
        const h = Math.round(stripInner.getBoundingClientRect().height);
        if (h > 0) {
          setMobileStrip1HeightPx(h);
        }
      }
      if (desktopInner) {
        const h = Math.round(desktopInner.getBoundingClientRect().height);
        if (h > 0) {
          setDesktopPrimaryBarHeightPx(h);
        }
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (stripInner) {
      ro.observe(stripInner);
    }
    if (desktopInner) {
      ro.observe(desktopInner);
    }
    return () => {
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    syncSecondaryDock();
    const secondaryEl = secondaryBarOuterRef.current;
    if (typeof ResizeObserver === 'undefined' || !secondaryEl) {
      return;
    }
    const ro = new ResizeObserver(() => {
      syncSecondaryDock();
    });
    ro.observe(secondaryEl);
    return () => {
      ro.disconnect();
    };
  }, [syncSecondaryDock]);

  useLayoutEffect(() => {
    syncMobileSearchDock();
    const searchWrap = mobileSearchWrapRef.current;
    if (typeof ResizeObserver === 'undefined' || !searchWrap) {
      setHeaderLayoutReady(true);
      return;
    }
    const ro = new ResizeObserver(() => {
      syncMobileSearchDock();
    });
    ro.observe(searchWrap);
    setHeaderLayoutReady(true);
    return () => {
      ro.disconnect();
    };
  }, [syncMobileSearchDock]);

  /**
   * When the mobile search bar returns to the normal flow (no longer docked), drop peek state so a
   * later dock does not reopen the strip without an intentional scroll-up gesture.
   */
  useEffect(() => {
    if (prevMobileSearchDockedRef.current === true && mobileSearchDocked === false) {
      setPrimaryBarPeekFromScrollUp(false);
    }
    prevMobileSearchDockedRef.current = mobileSearchDocked;
  }, [mobileSearchDocked]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollYRef.current;
      const delta = y - prev;
      lastScrollYRef.current = y;
      if (delta < -PRIMARY_STRIP_SCROLL_UP_REVEAL_THRESHOLD_PX) {
        setPrimaryBarPeekFromScrollUp(true);
      } else if (delta > PRIMARY_STRIP_SCROLL_DOWN_HIDE_THRESHOLD_PX) {
        setPrimaryBarPeekFromScrollUp(false);
      }
      const isDesktopLayout =
        typeof window !== 'undefined' &&
        window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY).matches;
      if (
        isDesktopLayout &&
        searchDropdownOpenRef.current &&
        delta > PRIMARY_STRIP_SCROLL_DOWN_HIDE_THRESHOLD_PX
      ) {
        searchDropdownOpenRef.current = false;
        setSearchDropdownOpen(false);
      }
      syncSecondaryDock();
      syncMobileSearchDock();
      if (isDesktopLayout) {
        const primaryEl = primaryStripRef.current;
        if (primaryEl && primaryEl.getBoundingClientRect().bottom > 0) {
          setPrimaryBarPeekFromScrollUp(false);
        }
      }
    };
    const onResize = () => {
      syncSecondaryDock();
      syncMobileSearchDock();
    };
    syncSecondaryDock();
    syncMobileSearchDock();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const onMq = () => {
      syncSecondaryDock();
      syncMobileSearchDock();
    };
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      mq.removeEventListener('change', onMq);
    };
  }, [syncSecondaryDock, syncMobileSearchDock]);

  useEffect(() => {
    setPrimaryBarPeekFromScrollUp(false);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [pathname]);

  const mobileStripPeekActive = mobileSearchDocked && primaryBarPeekFromScrollUp;
  const desktopPrimaryPeekActive = secondaryDocked && primaryBarPeekFromScrollUp;

  useEffect(() => {
    if (!mobileStripPeekActive) {
      setMobileStripPeekSlideIn(false);
      return;
    }
    setMobileStripPeekSlideIn(false);
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        setMobileStripPeekSlideIn(true);
      });
    });
    return () => {
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [mobileStripPeekActive]);

  useEffect(() => {
    if (!desktopPrimaryPeekActive) {
      setDesktopPrimaryPeekSlideIn(false);
      return;
    }
    setDesktopPrimaryPeekSlideIn(false);
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        setDesktopPrimaryPeekSlideIn(true);
      });
    });
    return () => {
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [desktopPrimaryPeekActive]);

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    isOpen: searchDropdownOpen,
    setIsOpen: setSearchDropdownOpen,
    selectedIndex: searchSelectedIndex,
    handleKeyDown: searchHandleKeyDown,
    clearSearch,
  } = useInstantSearch({
    debounceMs: 200,
    minQueryLength: 1,
    maxResults: 6,
    lang: getStoredLanguage(),
  });

  searchDropdownOpenRef.current = searchDropdownOpen;

  useLayoutEffect(() => {
    searchQueryForDockRef.current = searchQuery;
    syncSecondaryDock();
    syncMobileSearchDock();
  }, [searchQuery, searchDropdownOpen, syncSecondaryDock, syncMobileSearchDock]);

  const fetchCart = async () => {
    if (!isLoggedIn) {
      if (typeof window === 'undefined') {
        setCartCount(0);
        setCartTotal(0);
        return;
      }

      try {
        const stored = localStorage.getItem(CART_KEY);
        const guestCart: Array<{ productId: string; productSlug?: string; variantId: string; quantity: number; price?: number }> = stored ? JSON.parse(stored) : [];

        if (guestCart.length === 0) {
          setCartCount(0);
          setCartTotal(0);
          return;
        }

        const itemsCount = guestCart.reduce((sum, item) => sum + item.quantity, 0);
        const total = guestCart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
        setCartCount(itemsCount);
        setCartTotal(total);
      } catch (error) {
        console.error('Error loading guest cart:', error);
        setCartCount(0);
        setCartTotal(0);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setCartCount(0);
        setCartTotal(0);
        return;
      }
    }

    try {
      const response = await apiClient.get<{
        cart: {
          itemsCount: number;
          totals: {
            total: number;
          };
        };
      }>('/api/v1/cart');

      setCartCount(response.cart?.itemsCount || 0);
      setCartTotal(response.cart?.totals?.total || 0);
    } catch (error: unknown) {
      const err = error as { status?: number; statusCode?: number };
      if (err?.status !== 401 && err?.statusCode !== 401) {
        console.error('Error fetching cart:', error);
      }
      setCartCount(0);
      setCartTotal(0);
    }
  };

  // Load wishlist and compare counts from localStorage
  useEffect(() => {
    const updateCounts = () => {
      setWishlistCount(getWishlistCount());
      setCompareCount(getCompareCount());
    };

    // Initial load
    updateCounts();

    // Listen for updates
    const handleWishlistUpdate = () => {
      setWishlistCount(getWishlistCount());
    };

    const handleCompareUpdate = () => {
      setCompareCount(getCompareCount());
    };

    const handleAuthUpdate = () => {
      // Refresh counts when auth state changes
      updateCounts();
      fetchCart();
    };

    const handleCartUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.optimisticAdd) {
        setCartCount((c) => c + (detail.optimisticAdd.quantity ?? 1));
        setCartTotal((t) => t + (detail.optimisticAdd.price ?? 0) * (detail.optimisticAdd.quantity ?? 1));
        return;
      }
      if (detail?.itemsCount !== undefined && detail?.total !== undefined) {
        setCartCount(detail.itemsCount);
        setCartTotal(detail.total);
        return;
      }
      fetchCart();
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('compare-updated', handleCompareUpdate);
    window.addEventListener('auth-updated', handleAuthUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('compare-updated', handleCompareUpdate);
      window.removeEventListener('auth-updated', handleAuthUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [isLoggedIn]);

  // Fetch cart when logged in state changes
  useEffect(() => {
    fetchCart();
  }, [isLoggedIn]);

  // Load currency from localStorage
  useEffect(() => {
    setSelectedCurrency(getStoredCurrency());

    const handleCurrencyUpdate = () => {
      setSelectedCurrency(getStoredCurrency());
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
    };
  }, []);

  // Initialize and update currency rates
  useEffect(() => {
    // Load currency rates on mount
    initializeCurrencyRates().catch(console.error);

    // Listen for currency rates updates (when admin changes rates)
    const handleCurrencyRatesUpdate = () => {
      clearCurrencyRatesCache();
      // Force reload to get fresh rates from API
      initializeCurrencyRates(true).catch(console.error);
      // Force re-render by dispatching currency-updated event
      window.dispatchEvent(new Event('currency-updated'));
    };

    window.addEventListener('currency-rates-updated', handleCurrencyRatesUpdate);

    return () => {
      window.removeEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
    };
  }, []);

  // Sync search input with URL params - handled by HeaderSearchSync component wrapped in Suspense

  // Get only root categories (parent categories) for main dropdown
  // API already returns root categories in tree structure, so we just return them as-is
  const getRootCategories = (cats: Category[]): Category[] => {
    return cats; // API already returns only root categories
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobilePrimaryLangRef.current && !mobilePrimaryLangRef.current.contains(event.target as Node)) {
        setShowMobilePrimaryLangMenu(false);
      }
      const clickTarget = event.target as Node;
      const inDesktopCategories = categoriesPillWrapRef.current?.contains(clickTarget);
      if (!inDesktopCategories) {
        setShowCategoriesPillMenu(false);
      }
      if (searchModalRef.current && !searchModalRef.current.contains(event.target as Node)) {
        setShowSearchModal(false);
      }

      const isDesktopLayout =
        typeof window !== 'undefined' &&
        window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY).matches;
      if (
        isDesktopLayout &&
        !showSearchModalRef.current &&
        desktopSecondarySearchWrapRef.current &&
        !desktopSecondarySearchWrapRef.current.contains(clickTarget)
      ) {
        if (searchDropdownOpenRef.current) {
          searchDropdownOpenRef.current = false;
          setSearchDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const openSearch = () => setShowSearchModal(true);
    window.addEventListener('mobee:open-search', openSearch);
    return () => window.removeEventListener('mobee:open-search', openSearch);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!mobileMenuOpen) {
      return;
    }
    return acquireBodyScrollLock();
  }, [mobileMenuOpen]);

  // Focus search input when modal opens; sync dropdown with query. When modal is closed, do not
  // force-close the dropdown so the desktop secondary search bar can keep showing results.
  useEffect(() => {
    if (showSearchModal && searchInputRef.current) {
      searchInputRef.current.focus();
      setSearchDropdownOpen(searchQuery.trim().length >= 1);
      return;
    }
    if (showSearchModal) {
      setSearchDropdownOpen(searchQuery.trim().length >= 1);
      return;
    }
    if (searchQuery.trim().length < 1) {
      setSearchDropdownOpen(false);
    }
  }, [showSearchModal, searchQuery]);

  // Close search modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }

      if (showSearchModal) {
        setShowSearchModal(false);
      }

      if (showCategoriesPillMenu) {
        setShowCategoriesPillMenu(false);
      }

      if (showMobilePrimaryLangMenu) {
        setShowMobilePrimaryLangMenu(false);
      }

      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSearchModal, mobileMenuOpen, showCategoriesPillMenu, showMobilePrimaryLangMenu]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const selected = searchSelectedIndex >= 0 && searchResults[searchSelectedIndex];
    setShowSearchModal(false);
    if (selected) {
      router.push(`/products/${selected.slug}`);
      clearSearch();
      return;
    }
    const params = new URLSearchParams();
    if (query) {
      params.set('search', query);
    }
    clearSearch();
    const queryString = params.toString();
    router.push(queryString ? `/shop?${queryString}` : '/shop');
  };

  /**
   * Updates currency selection and notifies the app with a visible log entry.
   */
  const handleCurrencyChange = (currency: CurrencyCode) => {
    console.info('[Header][LangCurrency] Currency changed', {
      from: selectedCurrency,
      to: currency,
    });
    setStoredCurrency(currency);
    setSelectedCurrency(currency);
    // Trigger currency update event to refresh prices
    window.dispatchEvent(new Event('currency-updated'));
  };

  const mobileDockedHeaderSpacerPx =
    mobileSearchDocked && mobileSearchFlowSpacerPx > 0
      ? mobileSearchFlowSpacerPx +
        (mobileStripPeekActive && mobileStrip1HeightPx > 0 ? mobileStrip1HeightPx : 0)
      : 0;

  const mobileSearchPeekTopPx =
    mobileStripPeekActive && mobileStrip1HeightPx > 0 ? mobileStrip1HeightPx : 0;
  const mobileDockedSearchTopStyle: CSSProperties | undefined = mobileSearchDocked
    ? { top: mobileSearchPeekTopPx, ...getDockedBarTopMotionStyle(mobileSearchPeekTopPx) }
    : undefined;

  return (
    <div className={`relative z-50 ${montserrat.className}`}>
    <header
      ref={primaryStripRef}
      className="overflow-visible border-b border-gray-200 bg-white lg:border-b-0"
    >
      <Suspense fallback={null}>
        <HeaderSearchSync
          setSearchQuery={setSearchQuery}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
        />
      </Suspense>

      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        {/* Mobile — strip 1 scrolls away; strip 2 pins to viewport top once strip 1 has left */}
        <div
          ref={mobileStrip1WrapRef}
          className="lg:hidden"
          style={
            mobileStripPeekActive && mobileStrip1HeightPx > 0
              ? { height: mobileStrip1HeightPx }
              : undefined
          }
        >
          <div
            ref={mobileStrip1Ref}
            className={`border-b border-gray-100 ${
              mobileStripPeekActive
                ? `fixed left-0 right-0 top-0 z-[45] border-b border-gray-200 bg-white shadow-sm will-change-transform motion-reduce:will-change-auto motion-reduce:transition-none ${SITE_CONTENT_GUTTERS_CLASS} ${
                    mobileStripPeekSlideIn ? 'translate-y-0' : '-translate-y-full motion-reduce:translate-y-0'
                  }`
                : ''
            }`}
            style={
              mobileStripPeekActive && headerLayoutReady
                ? { ...HEADER_PRIMARY_PEEK_STRIP_MOTION_STYLE }
                : undefined
            }
          >
          <div className="relative flex items-center justify-between gap-3 py-2.5">
            <div className="relative z-20 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCategoriesPillMenu(false);
                  setShowMobilePrimaryLangMenu(false);
                  setMobileMenuOpen(true);
                }}
                className={MOBILE_PRIMARY_MENU_OPEN_BUTTON_CLASS}
                aria-expanded={mobileMenuOpen}
                aria-label={t('common.ariaLabels.openMenu')}
              >
                <span className={MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS} aria-hidden>
                  <span className={MOBILE_PRIMARY_MENU_BAR_CLASS} />
                  <span className={MOBILE_PRIMARY_MENU_BAR_CLASS} />
                  <span className={MOBILE_PRIMARY_MENU_BAR_CLASS} />
                </span>
              </button>
            </div>
            {/* Figma 180:1419 mark + 178:529 wordmark — center cluster like desktop */}
            <Link
              href="/"
              className="absolute left-1/2 top-1/2 z-10 flex max-w-[min(220px,48vw)] -translate-x-1/2 -translate-y-1/2 shrink-0 items-center justify-center transition-opacity active:opacity-90"
              aria-label={t('common.navigation.home')}
            >
              <SiteBrandLogo
                decorative
                alt={t('common.ariaLabels.siteLogo')}
                heightClass="h-8"
                priority
              />
            </Link>
            <div className="relative z-20 shrink-0" ref={mobilePrimaryLangRef}>
              <button
                type="button"
                onClick={() => setShowMobilePrimaryLangMenu((open) => !open)}
                className={mobilePrimaryLangButtonClassName}
                aria-label={t('common.ariaLabels.changeLanguageAndCurrency')}
                aria-expanded={showMobilePrimaryLangMenu}
                aria-haspopup="dialog"
                aria-controls="header-mobile-locale-menu"
              >
                <GlobeLanguageIcon />
              </button>
              {showMobilePrimaryLangMenu ? (
                <div
                  id="header-mobile-locale-menu"
                  className={MOBILE_LOCALE_MENU_PANEL_CLASS}
                  role="dialog"
                  aria-label={t('common.ariaLabels.changeLanguageAndCurrency')}
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
                            setShowMobilePrimaryLangMenu(false);
                            if (!active) setStoredLanguage(code);
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
                            setShowMobilePrimaryLangMenu(false);
                            if (!active) handleCurrencyChange(currency.code);
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
          </div>
          </div>
        </div>

        {headerLayoutReady && mobileDockedHeaderSpacerPx > 0 ? (
          <div
            aria-hidden
            className="shrink-0 motion-reduce:transition-none lg:hidden"
            style={{
              height: mobileDockedHeaderSpacerPx,
              ...HEADER_PRIMARY_PEEK_HEIGHT_MOTION_STYLE,
            }}
          />
        ) : null}

        <div
          ref={mobileSearchWrapRef}
          className={`border-b border-gray-100 bg-white py-2.5 shadow-sm lg:hidden ${
            headerLayoutReady && mobileSearchDocked
              ? 'fixed inset-x-0 z-40 border-b border-gray-200 motion-reduce:transition-none'
              : ''
          }`}
          style={headerLayoutReady ? mobileDockedSearchTopStyle : undefined}
        >
          <div className={headerLayoutReady && mobileSearchDocked ? SITE_CONTENT_GUTTERS_CLASS : 'min-w-0 w-full'}>
            <form
              ref={mobileHomeSearchFormRef}
              onSubmit={handleSearch}
              className="relative min-w-0 w-full"
            >
              <div className="relative w-full min-w-0">
                <div
                  className={`flex h-11 min-w-0 items-center gap-3 rounded-[64px] bg-[#f7f7f7] px-3 ${MOBILE_HOME_SEARCH_PILL_RIGHT_PAD_CLASS}`}
                >
                  <span className="inline-flex shrink-0 text-gray-500" aria-hidden>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="11" cy="11" r="7" strokeWidth={2} />
                      <path strokeLinecap="round" strokeWidth={2} d="M20 20l-4.3-4.3" />
                    </svg>
                  </span>
                  <input
                    ref={mobileHomeSearchInputRef}
                    type="search"
                    name="header-mobile-home-search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim().length >= 1) {
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
                    className="min-w-0 flex-1 bg-transparent text-sm leading-normal text-gray-900 outline-none placeholder:text-[#6b7280]"
                    aria-controls="header-mobile-search-results"
                    aria-expanded={searchDropdownOpen && searchResults.length > 0}
                    aria-autocomplete="list"
                  />
                </div>
                <button type="submit" className={MOBILE_HOME_SEARCH_SUBMIT_CLASS}>
                  {t('common.buttons.search')}
                </button>
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
                    router.push(`/products/${result.slug}`);
                    clearSearch();
                    setSearchDropdownOpen(false);
                  }}
                  onClose={() => setSearchDropdownOpen(false)}
                  className="mt-1"
                />
              ) : null}
            </form>
          </div>
        </div>

        {/* Desktop — Figma spacing at 2xl; nav link gaps scale lg → xl (iPad Pro uses lg gap-4). */}
        <div
          ref={desktopPrimaryWrapRef}
          className="hidden motion-reduce:transition-none lg:block"
          style={
            desktopPrimaryPeekActive && desktopPrimaryBarHeightPx > 0
              ? { height: desktopPrimaryBarHeightPx, ...HEADER_PRIMARY_PEEK_HEIGHT_MOTION_STYLE }
              : undefined
          }
        >
        <div
          ref={desktopPrimaryRowRef}
          className={`hidden min-w-0 w-full items-center justify-between gap-2 lg:gap-2 ipad-air-band:gap-3 xl:gap-4 lg:flex ${HEADER_STRIP_PADDING_Y} ${HEADER_STRIP_MIN_HEIGHT_LG} ${
            desktopPrimaryPeekActive
              ? `fixed left-0 right-0 top-0 z-[55] border-b border-gray-200 bg-white will-change-transform motion-reduce:will-change-auto motion-reduce:transition-none ${SITE_CONTENT_GUTTERS_CLASS} ${
                  desktopPrimaryPeekSlideIn ? 'translate-y-0' : '-translate-y-full motion-reduce:translate-y-0'
                }`
              : ''
          }`}
          style={desktopPrimaryPeekActive ? { ...HEADER_PRIMARY_PEEK_STRIP_MOTION_STYLE } : undefined}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-3 ipad-air-band:gap-5 xl:gap-6 2xl:gap-[76px]">
            <Link
              href="/"
              aria-label={t('common.navigation.home')}
              className="flex max-w-[min(280px,28vw)] shrink-0 items-center rounded-xl transition-opacity hover:opacity-95 active:opacity-90"
            >
              <SiteBrandLogo
                decorative
                alt={t('common.ariaLabels.siteLogo')}
                heightClass={HEADER_DESKTOP_BRAND_LOGO_HEIGHT_CLASS}
                priority
              />
            </Link>
            <nav
              className="ml-[calc(1.5rem-10px)] flex min-w-0 items-center gap-2 lg:ml-[calc(1.75rem-10px)] lg:gap-4 ipad-air-band:gap-5 xl:ml-[calc(2.75rem-24.5px)] xl:gap-5 2xl:gap-[60px]"
              aria-label="Primary"
            >
              <Link
                href="/"
                className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/')}`}
              >
                {t('common.navigation.home')}
              </Link>
              <Link
                href="/shop"
                className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/shop')}`}
              >
                {t('common.navigation.products')}
              </Link>
              <Link href="/about" className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/about')}`}>
                {t('common.navigation.about')}
              </Link>
              <Link href="/contact" className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/contact')}`}>
                {t('common.navigation.contact')}
              </Link>
            </nav>
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end">
            <HeaderPhoneLangCluster />
          </div>
        </div>
        </div>
      </div>
    </header>

      {secondaryDocked ? (
        <div
          aria-hidden
          className="hidden w-full shrink-0 lg:block"
          style={{ height: Math.max(secondaryBarHeightPx, 52) }}
        />
      ) : null}

      <HeaderSecondaryBar
        ref={secondaryBarOuterRef}
        dockToViewportTop={secondaryDocked}
        dockedViewportTopOffsetPx={
          desktopPrimaryPeekActive && desktopPrimaryBarHeightPx > 0 ? desktopPrimaryBarHeightPx : 0
        }
        montserratClassName={montserrat.className}
        categoriesWrapRef={categoriesPillWrapRef}
        categoriesLabel={t('common.navigation.categories')}
        isCategoriesMenuOpen={showCategoriesPillMenu}
        onCategoriesButtonClick={() => {
          setShowCategoriesPillMenu((open) => !open);
        }}
        categoriesMenu={
          showCategoriesPillMenu ? (
            <CategoriesMenuFlyout
              loading={loadingCategories}
              roots={getRootCategories(categories)}
              onItemNavigate={() => setShowCategoriesPillMenu(false)}
              loadingLabel={t('common.messages.loading')}
            />
          ) : null
        }
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          if (value.trim().length >= 1) {
            setSearchDropdownOpen(true);
          } else {
            setSearchDropdownOpen(false);
          }
        }}
        onSearchSubmit={handleSearch}
        onSearchKeyDown={searchHandleKeyDown}
        searchPlaceholder={t('common.mainHeader.searchPlaceholder')}
        searchInputRef={desktopSearchInputRef}
        onSearchFocus={() => {
          if (searchQuery.trim().length >= 1) {
            setSearchDropdownOpen(true);
          }
        }}
        searchResults={searchResults}
        searchLoading={searchLoading}
        searchError={searchError}
        searchDropdownOpen={searchDropdownOpen}
        searchSelectedIndex={searchSelectedIndex}
        onSearchResultClick={(result) => {
          router.push(`/products/${result.slug}`);
          clearSearch();
          setSearchDropdownOpen(false);
        }}
        onSearchDropdownClose={() => setSearchDropdownOpen(false)}
        secondarySearchBoundaryRef={desktopSecondarySearchWrapRef}
        suppressSearchDropdown={showSearchModal}
        compareCount={compareCount}
        wishlistCount={wishlistCount}
        cartCount={cartCount}
        selectedCurrency={selectedCurrency}
        currencies={Object.values(CURRENCIES)}
        onCurrencyChange={handleCurrencyChange}
        isLoggedIn={isLoggedIn}
        loginLabel={t('common.navigation.login')}
        profileLabel={t('common.navigation.profile')}
        compareAria={t('common.navigation.compare')}
        wishlistAria={t('common.navigation.wishlist')}
        cartAria={t('common.navigation.cart')}
        profileAria={t('common.navigation.profile')}
        isAdmin={isAdmin}
        adminPanelLabel={t('common.navigation.adminPanel')}
        logoutLabel={t('common.navigation.logout')}
        onLogout={logout}
      />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40 lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="flex h-full min-h-screen min-w-[17rem] w-[min(83vw,24rem)] max-w-full flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t('common.navigation.home')}
                className="flex min-w-0 max-w-[min(200px,70%)] shrink-0 items-center rounded-xl transition-opacity active:opacity-90"
              >
                <SiteBrandLogo decorative alt={t('common.ariaLabels.siteLogo')} heightClass="h-8" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={MOBILE_PRIMARY_MENU_OPEN_BUTTON_CLASS}
                aria-label={t('common.ariaLabels.closeMenu')}
              >
                <span className={MOBILE_PRIMARY_MENU_CLOSE_ICON_WRAP_CLASS} aria-hidden>
                  <span className={MOBILE_PRIMARY_MENU_CLOSE_BAR_DIAGONAL_POSITIVE_CLASS} />
                  <span className={MOBILE_PRIMARY_MENU_CLOSE_BAR_DIAGONAL_NEGATIVE_CLASS} />
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <nav className="flex h-full flex-col bg-white">
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
                  {primaryNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={MOBILE_DRAWER_PRIMARY_NAV_LINK_CLASS}
                    >
                      <span className={MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS}>{t(link.translationKey)}</span>
                      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}

                  <Link
                    href="/compare"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${MOBILE_DRAWER_NAV_BUTTON_CLASS} normal-case font-medium text-gray-700 md:hidden`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 normal-case font-medium text-gray-700">
                      <CompareIcon size={18} className="shrink-0" />
                      <span className="min-w-0 flex-1 text-pretty">{t('common.navigation.compare')}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {compareCount > 0 ? (
                        <span className={HEADER_NAV_COUNT_INLINE_BADGE_CLASS}>
                          {compareCount > 99 ? '99+' : compareCount}
                        </span>
                      ) : null}
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>

                  {isLoggedIn ? (
                    <>
                      <MobileDrawerSupportPhoneButtons />
                    </>
                  ) : (
                    <>
                      <MobileDrawerSupportPhoneButtons />
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`${MOBILE_DRAWER_NAV_BUTTON_CLASS} !justify-center px-2 py-3 text-center text-xs font-semibold normal-case text-gray-800`}
                        >
                          {t('common.navigation.login')}
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`${MOBILE_DRAWER_CTA_SOLID_ADMIN_CLASS} !justify-center px-2 py-3 text-center text-xs font-semibold`}
                        >
                          {t('common.navigation.register')}
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-gray-100 px-4 py-4 text-xs font-medium tracking-wide text-gray-500 normal-case">
                  {t('common.footer.copyright').replace('{year}', String(currentYear))}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-start justify-center pt-20 px-4">
          <div 
            ref={searchModalRef}
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200/80 p-4 animate-in fade-in slide-in-from-top-2 duration-200 relative"
          >
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              {/* Search Input */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length >= 1) setSearchDropdownOpen(true);
                }}
                onFocus={() => { if (searchQuery.trim().length >= 1) setSearchDropdownOpen(true); }}
                onKeyDown={searchHandleKeyDown}
                placeholder={t('common.placeholders.search')}
                className="flex-1 h-11 px-4 border-2 border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm placeholder:text-gray-400"
                aria-controls="search-results"
                aria-expanded={searchDropdownOpen && searchResults.length > 0}
                aria-autocomplete="list"
              />
              
              {/* Search Button */}
              <button
                type="submit"
                className="h-11 px-6 bg-gray-900 text-white rounded-r-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
              >
                <SearchIcon />
              </button>
            </form>

            <SearchDropdown
              results={searchResults}
              loading={searchLoading}
              error={searchError}
              isOpen={searchDropdownOpen}
              selectedIndex={searchSelectedIndex}
              query={searchQuery}
              onResultClick={(result) => {
                router.push(`/products/${result.slug}`);
                setShowSearchModal(false);
                clearSearch();
              }}
              onClose={() => setSearchDropdownOpen(false)}
              onSeeAllClick={() => setShowSearchModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

