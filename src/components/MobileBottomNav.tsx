'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Montserrat } from 'next/font/google';
import type { LucideIcon } from 'lucide-react';
import { Heart, Home, UserRound } from 'lucide-react';
import { getCompareCount, getWishlistCount } from '../lib/storageCounts';
import { useTranslation } from '../lib/i18n-client';
import { CompareIcon } from './icons/CompareIcon';
import { MobileNavBagIcon } from './icons/MobileNavBagIcon';
import { useMobileBottomNavCartCount } from './hooks/useMobileBottomNavCartCount';
import {
  MOBILE_BOTTOM_NAV_BADGE_CLASS,
  MOBILE_BOTTOM_NAV_INNER_PB_CLASS,
  MOBILE_BOTTOM_NAV_INNER_PT_CLASS,
  MOBILE_BOTTOM_NAV_LINK_HEIGHT_CLASS,
} from './mobile-bottom-nav.constants';

const montserratNav = Montserrat({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

type NavKey = 'home' | 'compare' | 'cart' | 'wishlist' | 'profile';

type MobileNavDef =
  | { key: 'cart'; labelKey: string; href: string }
  | { key: 'compare'; labelKey: string; href: string }
  | { key: Exclude<NavKey, 'cart' | 'compare'>; labelKey: string; href: string; icon: LucideIcon };

const INACTIVE_ICON_BOX: Record<NavKey, string> = {
  home: 'h-5 w-5',
  compare: 'h-5 w-5',
  cart: 'h-5 w-5',
  wishlist: 'h-6 w-6',
  profile: 'h-[22px] w-[22px]',
};

const ACTIVE_ICON_BOX = 'h-5 w-5';

const INACTIVE_ICON_COLOR = 'text-[#9e9e9e]';
const ACTIVE_ICON_COLOR = 'text-[#2db2ff]';

function pathIsActive(pathname: string, item: MobileNavDef): boolean {
  if (item.key === 'home') {
    return pathname === '/';
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

interface NavIconProps {
  item: MobileNavDef;
  active: boolean;
}

function MobileBottomNavIcon({ item, active }: NavIconProps) {
  const iconBox = active ? ACTIVE_ICON_BOX : INACTIVE_ICON_BOX[item.key];
  const iconColor = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;

  if (item.key === 'cart') {
    return (
      <MobileNavBagIcon
        size={20}
        strokeWidth={1.5}
        className={`shrink-0 ${iconBox} ${iconColor}`}
      />
    );
  }

  if (item.key === 'compare') {
    return (
      <CompareIcon
        size={20}
        strokeWidth={active ? 2.5 : 1.5}
        className={`shrink-0 ${iconBox} ${iconColor}`}
      />
    );
  }

  const Icon = item.icon;
  const useFill =
    active && (item.key === 'wishlist' || item.key === 'home' || item.key === 'profile');

  return (
    <Icon
      className={`shrink-0 ${iconBox} ${iconColor}`}
      strokeWidth={active ? 2.5 : 1.5}
      fill={useFill ? 'currentColor' : 'none'}
      aria-hidden
    />
  );
}

interface MobileNavItemProps {
  item: MobileNavDef;
  active: boolean;
  label: string;
  compareCount: number;
  wishlistCount: number;
  cartCount: number;
}

function MobileNavItem({ item, active, label, compareCount, wishlistCount, cartCount }: MobileNavItemProps) {
  const showCompareBadge = item.key === 'compare' && compareCount > 0;
  const showWishlistBadge = item.key === 'wishlist' && wishlistCount > 0;
  const showCartBadge = item.key === 'cart' && cartCount > 0;
  const badgeValue =
    item.key === 'compare' ? compareCount : item.key === 'wishlist' ? wishlistCount : item.key === 'cart' ? cartCount : 0;
  const showBadge = showCompareBadge || showWishlistBadge || showCartBadge;

  const iconWrap = (
    <div className="relative z-0 flex items-center justify-center overflow-visible">
      <MobileBottomNavIcon item={item} active={active} />
      {showBadge ? (
        <span className={MOBILE_BOTTOM_NAV_BADGE_CLASS} aria-hidden>
          {badgeValue > 99 ? '99+' : badgeValue}
        </span>
      ) : null}
    </div>
  );

  const linkClass = active
    ? `relative z-0 flex ${MOBILE_BOTTOM_NAV_LINK_HEIGHT_CLASS} shrink-0 items-center gap-2 overflow-visible rounded-[65px] bg-[rgba(25,158,235,0.1)] px-4 py-2 transition-opacity active:opacity-80`
    : `relative z-0 flex ${MOBILE_BOTTOM_NAV_LINK_HEIGHT_CLASS} min-h-0 flex-1 items-center justify-center overflow-visible py-1 transition-opacity active:opacity-80`;

  return (
    <Link
      href={item.href}
      className={linkClass}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      {...(item.key === 'cart' ? { 'data-cart-fly-target': 'mobile' as const } : {})}
    >
      {active ? (
        <>
          {iconWrap}
          <span
            className={`${montserratNav.className} shrink-0 whitespace-nowrap text-sm font-normal leading-normal text-[#2db2ff]`}
          >
            {label}
          </span>
        </>
      ) : (
        iconWrap
      )}
    </Link>
  );
}

/**
 * Mobile bottom bar — Figma mobee-new node 183:1956 (spacing, pill, Iconly Bold/Light weights).
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [compareCount, setCompareCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const cartCount = useMobileBottomNavCartCount();

  useEffect(() => {
    const updateWishlistCount = () => {
      setWishlistCount(getWishlistCount());
    };
    const updateCompareCount = () => {
      setCompareCount(getCompareCount());
    };

    updateWishlistCount();
    updateCompareCount();
    window.addEventListener('wishlist-updated', updateWishlistCount);
    window.addEventListener('compare-updated', updateCompareCount);

    return () => {
      window.removeEventListener('wishlist-updated', updateWishlistCount);
      window.removeEventListener('compare-updated', updateCompareCount);
    };
  }, []);

  const items: MobileNavDef[] = useMemo(
    () => [
      { key: 'home', labelKey: 'common.navigation.home', href: '/', icon: Home },
      { key: 'compare', labelKey: 'common.navigation.compare', href: '/compare' },
      { key: 'cart', labelKey: 'common.navigation.cart', href: '/cart' },
      { key: 'wishlist', labelKey: 'common.navigation.wishlist', href: '/wishlist', icon: Heart },
      { key: 'profile', labelKey: 'common.navigation.profile', href: '/profile', icon: UserRound },
    ],
    [],
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 overflow-visible bg-white drop-shadow-[0px_0px_20px_rgba(0,0,0,0.15)] lg:hidden">
      <div
        className={`flex w-full items-center justify-center gap-4 overflow-visible px-6 ${MOBILE_BOTTOM_NAV_INNER_PT_CLASS} ${MOBILE_BOTTOM_NAV_INNER_PB_CLASS}`}
      >
        {items.map((item) => (
          <MobileNavItem
            key={item.key}
            item={item}
            active={pathIsActive(pathname, item)}
            label={t(item.labelKey)}
            compareCount={compareCount}
            wishlistCount={wishlistCount}
            cartCount={cartCount}
          />
        ))}
      </div>
    </nav>
  );
}
