'use client';

import Link from 'next/link';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useLayoutEffect, useCallback, useRef, Suspense } from 'react';
import type { AnimationEvent, FormEvent } from 'react';
import { getStoredCurrency, setStoredCurrency, type CurrencyCode, CURRENCIES, initializeCurrencyRates, clearCurrencyRatesCache } from '../lib/currency';
import { useTranslation } from '../lib/i18n-client';
import { getStoredLanguage } from '../lib/language';
import { useInstantSearch } from './hooks/useInstantSearch';
import { useHeaderRoutePrefetch, prefetchHeaderHref } from './hooks/useHeaderRoutePrefetch';
import { SearchDropdown } from './SearchDropdown';
import { useAuth } from '../lib/auth/AuthContext';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';
import { apiClient } from '../lib/api-client';
import { MOBILE_IOS_NO_FOCUS_ZOOM_INPUT_TEXT_CLASS } from '../lib/mobile-ios-input-font.constants';
import { CART_KEY, getCompareCount, getWishlistCount } from '../lib/storageCounts';
import { LanguageSwitcherPill } from './LanguageSwitcherPill';
import { HEADER_FIGMA_ASSETS } from './header-figma-assets';
import {
  HEADER_PRIMARY_PEEK_HEIGHT_MOTION_STYLE,
  HEADER_PRIMARY_PEEK_STRIP_MOTION_STYLE,
  HEADER_STRIP_MIN_HEIGHT_LG,
  HEADER_DESKTOP_BRAND_LOGO_HEIGHT_CLASS,
  HEADER_STRIP_PADDING_Y,
  MOBILE_PRIMARY_MENU_CLOSE_BAR_DIAGONAL_NEGATIVE_CLASS,
  MOBILE_PRIMARY_MENU_CLOSE_BAR_DIAGONAL_POSITIVE_CLASS,
  MOBILE_PRIMARY_MENU_CLOSE_ICON_WRAP_CLASS,
  MOBILE_PRIMARY_MENU_OPEN_BUTTON_CLASS,
  SITE_CONTENT_GUTTERS_CLASS,
} from './header-strip-layout';
import { SiteBrandLogo } from './SiteBrandLogo';
import { MobileHeaderToolbar } from './MobileHeaderToolbar';
import {
  HeaderSecondaryBar,
} from './HeaderSecondaryBar';
import { useCategoriesTree } from './CategoriesTreeContext';
import { CategoriesMenuFlyout } from './CategoriesMenuFlyout';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../lib/layout-breakpoints.constants';
import {
  MOBILE_DRAWER_NAV_BUTTON_CLASS,
  MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS,
  MOBILE_DRAWER_PRIMARY_NAV_LINK_CLASS,
  MOBILE_DRAWER_SHELL_BACKDROP_CLASS,
  MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS,
  MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS,
  MOBILE_DRAWER_SHELL_PANEL_CLASS,
  MOBILE_DRAWER_SHELL_PANEL_MOTION_IN_CLASS,
  MOBILE_DRAWER_SHELL_PANEL_MOTION_OUT_CLASS,
  MOBILE_DRAWER_SHELL_ROOT_CLASS,
  MOBILE_DRAWER_SHELL_TRANSITION_MS,
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

const montserrat = siteMontserrat;

const primaryNavLinks = [
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

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
            decoding="async"
            loading="lazy"
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
                decoding="async"
                loading="lazy"
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
  const [mobileMenuExiting, setMobileMenuExiting] = useState(false);
  const [showCategoriesPillMenu, setShowCategoriesPillMenu] = useState(false);
  const [categoriesMenuEntered, setCategoriesMenuEntered] = useState(false);
  const [showMobilePrimaryLangMenu, setShowMobilePrimaryLangMenu] = useState(false);
  const [mobileLocaleMenuExiting, setMobileLocaleMenuExiting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('AMD');
  const { categories, loadingCategories } = useCategoriesTree();
  const [, setSelectedCategory] = useState<Category | null>(null);

  useHeaderRoutePrefetch(router, { boostKey: mobileMenuOpen || mobileMenuExiting || showCategoriesPillMenu });

  const prefetchNavHref = useCallback(
    (href: string) => prefetchHeaderHref(router, href),
    [router],
  );

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
  const desktopPrimaryWrapRef = useRef<HTMLDivElement>(null);
  const desktopPrimaryRowRef = useRef<HTMLDivElement>(null);
  const categoriesPillWrapRef = useRef<HTMLDivElement>(null);
  const mobilePrimaryLangRef = useRef<HTMLDivElement>(null);
  const primaryStripRef = useRef<HTMLElement | null>(null);
  const secondaryBarOuterRef = useRef<HTMLDivElement | null>(null);
  /** Latest header search text for scroll-dock logic (refs avoid stale closures in scroll handlers). */
  const searchQueryForDockRef = useRef('');
  const [secondaryDocked, setSecondaryDocked] = useState(false);
  const [secondaryBarHeightPx, setSecondaryBarHeightPx] = useState(0);
  const [primaryBarPeekFromScrollUp, setPrimaryBarPeekFromScrollUp] = useState(false);
  const [desktopPrimaryBarHeightPx, setDesktopPrimaryBarHeightPx] = useState(0);
  const lastScrollYRef = useRef(0);
  const [desktopPrimaryPeekSlideIn, setDesktopPrimaryPeekSlideIn] = useState(false);

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

  useLayoutEffect(() => {
    const desktopInner = desktopPrimaryRowRef.current;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => {
      if (desktopInner) {
        const h = Math.round(desktopInner.getBoundingClientRect().height);
        if (h > 0) {
          setDesktopPrimaryBarHeightPx(h);
        }
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
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
      if (isDesktopLayout) {
        const primaryEl = primaryStripRef.current;
        if (primaryEl && primaryEl.getBoundingClientRect().bottom > 0) {
          setPrimaryBarPeekFromScrollUp(false);
        }
      }
    };
    const onResize = () => {
      syncSecondaryDock();
    };
    syncSecondaryDock();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const onMq = () => {
      syncSecondaryDock();
    };
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      mq.removeEventListener('change', onMq);
    };
  }, [syncSecondaryDock]);

  useEffect(() => {
    setPrimaryBarPeekFromScrollUp(false);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [pathname]);

  const desktopPrimaryPeekActive = secondaryDocked && primaryBarPeekFromScrollUp;

  const closeMobileLocaleMenu = useCallback(() => {
    setShowMobilePrimaryLangMenu((open) => {
      if (open) {
        setMobileLocaleMenuExiting(true);
      }
      return false;
    });
  }, []);

  const toggleMobileLocaleMenu = useCallback(() => {
    if (mobileLocaleMenuExiting) {
      return;
    }
    if (showMobilePrimaryLangMenu) {
      closeMobileLocaleMenu();
      return;
    }
    setMobileLocaleMenuExiting(false);
    setShowMobilePrimaryLangMenu(true);
  }, [mobileLocaleMenuExiting, showMobilePrimaryLangMenu, closeMobileLocaleMenu]);

  const handleMobileLocaleMenuAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName.includes('fade-out')) {
      setMobileLocaleMenuExiting(false);
    }
  }, []);

  const mobileLocaleMenuVisible = showMobilePrimaryLangMenu || mobileLocaleMenuExiting;

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen((open) => {
      if (open) {
        setMobileMenuExiting(true);
      }
      return false;
    });
  }, []);

  const openMobileMenu = useCallback(() => {
    if (mobileMenuExiting) {
      return;
    }
    setMobileMenuExiting(false);
    setMobileMenuOpen(true);
  }, [mobileMenuExiting]);

  const handleMobileMenuPanelAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.animationName.includes('mobile-drawer-panel-out')) {
      setMobileMenuExiting(false);
    }
  }, []);

  const mobileMenuVisible = mobileMenuOpen || mobileMenuExiting;

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
  }, [searchQuery, searchDropdownOpen, syncSecondaryDock]);

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
        closeMobileLocaleMenu();
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
    if (mobileMenuOpen || !mobileMenuExiting) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setMobileMenuExiting(false);
    }, MOBILE_DRAWER_SHELL_TRANSITION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mobileMenuOpen, mobileMenuExiting]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!mobileMenuVisible) {
      return;
    }
    return acquireBodyScrollLock();
  }, [mobileMenuVisible]);

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
        closeMobileLocaleMenu();
      }

      if (mobileMenuOpen) {
        closeMobileMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSearchModal, mobileMenuOpen, showCategoriesPillMenu, showMobilePrimaryLangMenu, closeMobileLocaleMenu, closeMobileMenu]);

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

  return (
    <div className={`relative z-50 ${montserrat.className}`}>
    <header
      ref={primaryStripRef}
      className="overflow-visible bg-white max-lg:border-b-0 lg:border-b-0"
    >
      <Suspense fallback={null}>
        <HeaderSearchSync
          setSearchQuery={setSearchQuery}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
        />
      </Suspense>

      <MobileHeaderToolbar
        t={t}
        compareCount={compareCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        searchError={searchError}
        searchDropdownOpen={searchDropdownOpen}
        setSearchDropdownOpen={setSearchDropdownOpen}
        searchSelectedIndex={searchSelectedIndex}
        searchHandleKeyDown={searchHandleKeyDown}
        handleSearch={handleSearch}
        clearSearch={clearSearch}
        routerPush={router.push}
        showSearchModal={showSearchModal}
        formRef={mobileHomeSearchFormRef}
        inputRef={mobileHomeSearchInputRef}
        localeContainerRef={mobilePrimaryLangRef}
        localeMenuVisible={mobileLocaleMenuVisible}
        localeMenuExiting={mobileLocaleMenuExiting}
        selectedCurrency={selectedCurrency}
        onToggleLocaleMenu={toggleMobileLocaleMenu}
        onCloseLocaleMenu={closeMobileLocaleMenu}
        onLocaleMenuAnimationEnd={handleMobileLocaleMenuAnimationEnd}
        onCurrencyChange={handleCurrencyChange}
        onOpenMenu={() => {
          setShowCategoriesPillMenu(false);
          closeMobileLocaleMenu();
          openMobileMenu();
        }}
        mobileMenuOpen={mobileMenuOpen}
      />

      <div className={SITE_CONTENT_GUTTERS_CLASS}>
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
              prefetch
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
                prefetch
                className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/')}`}
              >
                {t('common.navigation.home')}
              </Link>
              <Link
                href="/shop"
                prefetch
                className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/shop')}`}
              >
                {t('common.navigation.products')}
              </Link>
              <Link href="/about" prefetch className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/about')}`}>
                {t('common.navigation.about')}
              </Link>
              <Link href="/contact" prefetch className={`flex items-center justify-center py-[0.15rem] ${navTextClass('/contact')}`}>
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
        categoriesChevronOpen={categoriesMenuEntered}
        onCategoriesButtonClick={() => {
          setShowCategoriesPillMenu((open) => !open);
        }}
        categoriesMenu={
          <CategoriesMenuFlyout
            open={showCategoriesPillMenu}
            onEnteredChange={setCategoriesMenuEntered}
            loading={loadingCategories}
            roots={getRootCategories(categories)}
            onItemNavigate={() => setShowCategoriesPillMenu(false)}
            loadingLabel={t('common.messages.loading')}
            onLinkHover={prefetchNavHref}
          />
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
      {mobileMenuVisible ? (
        <div
          className={MOBILE_DRAWER_SHELL_ROOT_CLASS}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className={`${MOBILE_DRAWER_SHELL_BACKDROP_CLASS} ${
              mobileMenuExiting
                ? MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS
                : MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS
            }`}
            aria-label={t('common.ariaLabels.closeMenu')}
            onClick={closeMobileMenu}
          />
          <div
            className={`${MOBILE_DRAWER_SHELL_PANEL_CLASS} ${
              mobileMenuExiting
                ? MOBILE_DRAWER_SHELL_PANEL_MOTION_OUT_CLASS
                : MOBILE_DRAWER_SHELL_PANEL_MOTION_IN_CLASS
            }`}
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={handleMobileMenuPanelAnimationEnd}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <Link
                href="/"
                onClick={closeMobileMenu}
                aria-label={t('common.navigation.home')}
                className="flex min-w-0 max-w-[min(200px,70%)] shrink-0 items-center rounded-xl transition-opacity active:opacity-90"
              >
                <SiteBrandLogo decorative alt={t('common.ariaLabels.siteLogo')} heightClass="h-8" />
              </Link>
              <button
                type="button"
                onClick={closeMobileMenu}
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
                      prefetch
                      onClick={closeMobileMenu}
                      className={MOBILE_DRAWER_PRIMARY_NAV_LINK_CLASS}
                    >
                      <span className={MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS}>{t(link.translationKey)}</span>
                      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}

                  <MobileDrawerSupportPhoneButtons />
                </div>
              </nav>
            </div>
          </div>
        </div>
      ) : null}

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
                className={`flex-1 h-11 px-4 border-2 border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${MOBILE_IOS_NO_FOCUS_ZOOM_INPUT_TEXT_CLASS} placeholder:text-gray-400`}
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

