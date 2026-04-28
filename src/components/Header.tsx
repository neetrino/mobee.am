'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useLayoutEffect, useCallback, useRef, Suspense } from 'react';
import type { FormEvent, ReactNode, CSSProperties } from 'react';
import { getStoredCurrency, setStoredCurrency, type CurrencyCode, CURRENCIES, initializeCurrencyRates, clearCurrencyRatesCache } from '../lib/currency';
import { useTranslation } from '../lib/i18n-client';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../lib/language';
import { useInstantSearch } from './hooks/useInstantSearch';
import { SearchDropdown } from './SearchDropdown';
import { useAuth } from '../lib/auth/AuthContext';
import { apiClient } from '../lib/api-client';
import { CART_KEY, getCompareCount, getWishlistCount } from '../lib/storageCounts';
import { LanguageSwitcherPill } from './LanguageSwitcherPill';
import { HEADER_FIGMA_ASSETS } from './header-figma-assets';
import {
  HEADER_STRIP_MIN_HEIGHT_LG,
  HEADER_STRIP_PADDING_Y,
  MOBILE_HEADER_CENTER_LOGO_RADIUS_PX,
  MOBILE_HEADER_CENTER_LOGO_SIZE_PX,
  MOBILE_PRIMARY_MENU_BAR_CLASS,
  MOBILE_PRIMARY_MENU_ICON_WRAP_CLASS,
  SITE_CONTENT_GUTTERS_CLASS,
} from './header-strip-layout';
import { CompareIcon } from './icons/CompareIcon';
import { CartIcon } from './icons/CartIcon';
import { HeaderSecondaryBar } from './HeaderSecondaryBar';
import { useCategoriesTree } from './CategoriesTreeContext';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '800', '900'],
  display: 'swap',
});

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

// Icon Components
const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Arrow icon for categories with subcategories (▶)
const ArrowRightIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-auto">
    <path d="M3 2L5 4L3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Profile icon for logged in state (filled style with background)
 */
const ProfileIconFilled = () => (
  <div className="relative w-[19px] h-[19px] flex items-center justify-center">
    {/* Background circle */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full opacity-90 group-hover:opacity-100 transition-opacity duration-200 shadow-md"></div>
    {/* Filled icon */}
    <svg 
      width="19" 
      height="19" 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="relative z-10"
    >
      <circle cx="10" cy="7" r="3.2" fill="white" />
      <path d="M5 17C5 14.5 7.5 12.5 10 12.5C12.5 12.5 15 14.5 15 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </div>
);

const WishlistIcon = () => (
  <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 17L8.55 15.7C4.4 12.2 2 10.1 2 7.5C2 5.4 3.4 4 5.5 4C6.8 4 8.1 4.6 9 5.5C9.9 4.6 11.2 4 12.5 4C14.6 4 16 5.4 16 7.5C16 10.1 13.6 12.2 9.45 15.7L10 17Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
      const foundCategory = allCategories.find((cat) => cat.slug === categoryParam);
      setSelectedCategory(foundCategory || null);
    } else {
      setSelectedCategory(null);
    }
  }, [searchParams, categories, setSearchQuery, setSelectedCategory]);

  return null;
}

/**
 * Category Menu Item Component with nested submenu support
 * Displays subcategories in a multi-column layout without scroll
 */
function CategoryMenuItem({ 
  category, 
  onClose 
}: { 
  category: Category; 
  onClose: () => void;
}) {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [submenuStyle, setSubmenuStyle] = useState<CSSProperties>({});
  const submenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const menuItemRef = useRef<HTMLDivElement>(null);
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

  // Calculate submenu position relative to Products dropdown
  useEffect(() => {
    if (showSubmenu && submenuRef.current && menuItemRef.current) {
      const menuItem = menuItemRef.current;
      
      // Find Products dropdown container (parent with w-64 class)
      const productsDropdown = menuItem.closest('.w-64');
      if (productsDropdown) {
        const dropdownRect = productsDropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        // Position submenu to the right of Products dropdown, aligned higher than dropdown
        const leftPosition = dropdownRect.width; // Right edge of Products dropdown
        const topPosition = -12; // Move up a bit from top of dropdown
        const maxWidth = Math.min(600, viewportWidth - dropdownRect.right - 20);
        
        setSubmenuStyle({
          left: `${leftPosition}px`,
          top: `${topPosition}px`,
          maxWidth: `${maxWidth}px`
        });
      }
    }
  }, [showSubmenu]);

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
          className="absolute top-0 z-[60]"
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
          <div 
            className="bg-white rounded-xl shadow-2xl border border-gray-200/80 p-6 min-w-[500px]"
          >
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
        <div className="overflow-visible rounded-xl border border-gray-200/80 bg-white shadow-2xl">
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

/** Figma mobee-new node 178:535 — support phone + language pill */
function HeaderPhoneLangCluster({ phoneNumberVisibility }: { phoneNumberVisibility?: 'always' | 'smUp' }) {
  const { t } = useTranslation();
  const telRaw = t('common.header.supportPhoneTel').replace(/[^\d+]/g, '');
  const telHref = telRaw.startsWith('+') ? `tel:${telRaw}` : `tel:+${telRaw}`;

  const numberClass =
    phoneNumberVisibility === 'smUp'
      ? 'hidden truncate text-[14px] font-semibold leading-7 tracking-[0.2px] text-[#374151] sm:inline'
      : 'truncate text-[14px] font-semibold leading-7 tracking-[0.2px] text-[#374151]';

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-6 sm:gap-[50px]">
      <a href={telHref} className="flex min-w-0 items-center gap-2" aria-label={t('common.header.supportPhoneAria')}>
        <span className="relative size-6 shrink-0">
          <img
            src={HEADER_FIGMA_ASSETS.phoneIcon}
            alt=""
            width={24}
            height={24}
            className="absolute inset-0 block size-6 max-w-none"
          />
        </span>
        <span className={numberClass}>{t('common.header.supportPhoneNumber')}</span>
      </a>
      <LanguageSwitcherPill />
    </div>
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
  const [cartTotal, setCartTotal] = useState(0);
  const [showMobileCurrency, setShowMobileCurrency] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
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
      : 'whitespace-nowrap text-[13px] font-semibold leading-5 tracking-[0.2px] text-[#374151] hover:text-gray-900 xl:text-[14px]';

  const mobileCurrencyRef = useRef<HTMLDivElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileHomeSearchFormRef = useRef<HTMLFormElement>(null);
  const mobileHomeSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileStrip1Ref = useRef<HTMLDivElement>(null);
  const mobileSearchWrapRef = useRef<HTMLDivElement>(null);
  const categoriesPillWrapRef = useRef<HTMLDivElement>(null);
  const mobilePrimaryLangRef = useRef<HTMLDivElement>(null);
  const primaryStripRef = useRef<HTMLElement | null>(null);
  const secondaryBarOuterRef = useRef<HTMLDivElement | null>(null);
  const [secondaryDocked, setSecondaryDocked] = useState(false);
  const [secondaryBarHeightPx, setSecondaryBarHeightPx] = useState(0);
  const [mobileSearchDocked, setMobileSearchDocked] = useState(false);
  const [mobileSearchFlowSpacerPx, setMobileSearchFlowSpacerPx] = useState(0);
  const [showCategoriesPillMenu, setShowCategoriesPillMenu] = useState(false);
  const [showMobilePrimaryLangMenu, setShowMobilePrimaryLangMenu] = useState(false);

  const syncSecondaryDock = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
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
    setSecondaryDocked(primaryEl.getBoundingClientRect().bottom <= 0);
  }, []);

  const syncMobileSearchDock = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setMobileSearchDocked(false);
      setMobileSearchFlowSpacerPx(0);
      return;
    }
    const strip1 = mobileStrip1Ref.current;
    const searchWrap = mobileSearchWrapRef.current;
    if (searchWrap) {
      const h = Math.round(searchWrap.getBoundingClientRect().height);
      if (h > 0) {
        setMobileSearchFlowSpacerPx(h);
      }
    }
    if (!strip1) {
      return;
    }
    setMobileSearchDocked(strip1.getBoundingClientRect().bottom <= 0);
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
      return;
    }
    const ro = new ResizeObserver(() => {
      syncMobileSearchDock();
    });
    ro.observe(searchWrap);
    return () => {
      ro.disconnect();
    };
  }, [syncMobileSearchDock]);

  useEffect(() => {
    const onScroll = () => {
      syncSecondaryDock();
      syncMobileSearchDock();
    };
    const onResize = () => {
      syncSecondaryDock();
      syncMobileSearchDock();
    };
    syncSecondaryDock();
    syncMobileSearchDock();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const mq = window.matchMedia('(min-width: 1024px)');
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

  useLayoutEffect(() => {
    syncMobileSearchDock();
  }, [searchDropdownOpen, syncMobileSearchDock]);

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

  const selectedCurrencyInfo = CURRENCIES[selectedCurrency];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileCurrencyRef.current && !mobileCurrencyRef.current.contains(event.target as Node)) {
        setShowMobileCurrency(false);
      }
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

    if (mobileMenuOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
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

  return (
    <div className={montserrat.className}>
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
        <div ref={mobileStrip1Ref} className="border-b border-gray-100 lg:hidden">
          <div className="relative flex items-center justify-between gap-3 py-2.5">
            <div className="relative z-20 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCategoriesPillMenu(false);
                  setShowMobilePrimaryLangMenu(false);
                  setMobileMenuOpen(true);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
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
              className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 shrink-0 items-center gap-2 transition-opacity active:opacity-90"
              aria-label={t('common.navigation.home')}
            >
              <div
                className="flex shrink-0 items-center justify-center overflow-hidden bg-[#2db2ff] text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
                style={{
                  width: MOBILE_HEADER_CENTER_LOGO_SIZE_PX,
                  height: MOBILE_HEADER_CENTER_LOGO_SIZE_PX,
                  borderRadius: MOBILE_HEADER_CENTER_LOGO_RADIUS_PX,
                }}
              >
                <span className="text-[18px] font-bold leading-none">M</span>
              </div>
              <span className="text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#111827]">Mobee</span>
            </Link>
            <div className="relative z-20 shrink-0" ref={mobilePrimaryLangRef}>
              <button
                type="button"
                onClick={() => setShowMobilePrimaryLangMenu((open) => !open)}
                className={mobilePrimaryLangButtonClassName}
                aria-label={t('common.ariaLabels.changeLanguage')}
                aria-expanded={showMobilePrimaryLangMenu}
                aria-haspopup="listbox"
              >
                <GlobeLanguageIcon />
              </button>
              {showMobilePrimaryLangMenu ? (
                <div
                  className="absolute right-0 top-full z-[60] mt-2 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl"
                  role="listbox"
                  aria-label={t('common.ariaLabels.changeLanguage')}
                >
                  {MOBILE_PRIMARY_LANG_PILL_CODES.map((code) => {
                    const active = getStoredLanguage() === code;
                    const label = code === 'hy' ? 'ՀԱՅ' : code === 'ru' ? 'РУС' : 'EN';
                    return (
                      <button
                        key={code}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setShowMobilePrimaryLangMenu(false);
                          if (!active) setStoredLanguage(code);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
                          active
                            ? 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {mobileSearchDocked && mobileSearchFlowSpacerPx > 0 ? (
          <div aria-hidden className="shrink-0 lg:hidden" style={{ height: mobileSearchFlowSpacerPx }} />
        ) : null}

        <div
          ref={mobileSearchWrapRef}
          className={`border-b border-gray-100 bg-white py-2.5 shadow-sm lg:hidden ${
            mobileSearchDocked ? 'fixed inset-x-0 top-0 z-40 border-b border-gray-200' : ''
          }`}
        >
          <div className={mobileSearchDocked ? SITE_CONTENT_GUTTERS_CLASS : 'min-w-0 w-full'}>
            <form
              ref={mobileHomeSearchFormRef}
              onSubmit={handleSearch}
              className="relative min-w-0 w-full"
            >
              <div className="flex h-11 items-center gap-3 rounded-[64px] bg-[#f7f7f7] px-3">
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

        {/* Desktop — Figma spacing at 2xl; tighter gaps below xl so the bar fits at lg */}
        <div
          className={`hidden items-center justify-between gap-4 lg:flex ${HEADER_STRIP_PADDING_Y} ${HEADER_STRIP_MIN_HEIGHT_LG}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6 xl:gap-10 2xl:gap-[76px]">
            <Link href="/" className="flex w-[104px] shrink-0 items-center gap-2">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2db2ff] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
                <span className="text-[18px] font-bold leading-6 text-white">M</span>
              </div>
              <span className="text-[18px] font-bold leading-6 tracking-[-0.5px] text-[#111827]">Mobee</span>
            </Link>
            <nav
              className="flex min-w-0 items-center gap-3 lg:gap-4 xl:gap-8 2xl:gap-[60px]"
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
        suppressSearchDropdown={showSearchModal}
        compareCount={compareCount}
        wishlistCount={wishlistCount}
        cartCount={cartCount}
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
          className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="h-full min-h-screen w-1/2 min-w-[16rem] max-w-full bg-white flex flex-col shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-w-0 items-center gap-2"
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2db2ff] shadow-sm">
                    <span className="text-[18px] font-bold leading-6 text-white">M</span>
                  </div>
                  <span className="truncate text-lg font-bold tracking-tight text-gray-900">Mobee</span>
                </Link>
                <div className="relative shrink-0" ref={mobileCurrencyRef}>
                  <button
                    type="button"
                    onClick={() => setShowMobileCurrency(!showMobileCurrency)}
                    className="flex h-9 cursor-pointer items-center justify-center gap-1 rounded-full border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 transition-colors"
                  >
                    <span className="text-sm font-semibold leading-none">{selectedCurrencyInfo.symbol}</span>
                    <span className="text-xs font-medium leading-none">{selectedCurrency}</span>
                    <ChevronDownIcon />
                  </button>
                  {showMobileCurrency ? (
                    <div className="absolute right-0 top-full z-[60] mt-2 w-40 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-2xl">
                      {Object.values(CURRENCIES).map((currency) => (
                        <button
                          key={currency.code}
                          type="button"
                          onClick={() => {
                            handleCurrencyChange(currency.code);
                            setShowMobileCurrency(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-150 ${
                            selectedCurrency === currency.code
                              ? 'bg-gradient-to-r from-gray-100 to-gray-50 font-semibold text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{currency.code}</span>
                            <span className="text-gray-500">{currency.symbol}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-gray-900">{t('common.navigation.categories')}</p>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                  aria-label={t('common.ariaLabels.closeMenu')}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-b border-gray-100 px-4 py-2">
              <HeaderPhoneLangCluster phoneNumberVisibility="always" />
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <nav className="flex h-full flex-col border-y border-gray-200 text-sm font-semibold uppercase tracking-wide text-gray-800 bg-white">
                <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
                  {primaryNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                      {t(link.translationKey)}
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowSearchModal(true);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 normal-case font-medium text-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <SearchIcon />
                      {t('common.buttons.search')}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <Link
                    href="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2 normal-case font-medium text-gray-700">
                      <WishlistIcon />
                      {t('common.navigation.wishlist')}
                    </span>
                    {wishlistCount > 0 && (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
                        {wishlistCount > 99 ? '99+' : wishlistCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/compare"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2 normal-case font-medium text-gray-700">
                      <CompareIcon size={18} />
                      {t('common.navigation.compare')}
                    </span>
                    {compareCount > 0 && (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
                        {compareCount > 99 ? '99+' : compareCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2 normal-case font-medium text-gray-700">
                      <CartIcon size={19} />
                      {t('common.navigation.cart')}
                    </span>
                    {cartCount > 0 && (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>

                  {isLoggedIn ? (
                    <>
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 normal-case text-gray-800"
                      >
                        <span className="flex items-center gap-2">
                          <ProfileIconFilled />
                          {t('common.navigation.profile')}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 normal-case text-blue-700"
                        >
                          <span>{t('common.navigation.adminPanel')}</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-red-600 hover:bg-red-50 normal-case font-semibold"
                      >
                        {t('common.navigation.logout')}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 normal-case text-gray-800"
                      >
                        <span>{t('common.navigation.login')}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-900 hover:text-white normal-case text-gray-900 font-semibold"
                      >
                        <span>{t('common.navigation.register')}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </>
                  )}
                </div>

                <div className="border-t border-gray-200 px-4 py-4 text-xs font-medium tracking-wide text-gray-500 normal-case">
                  © {currentYear} Mobee
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
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

