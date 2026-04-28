'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Montserrat } from 'next/font/google';
import { Heart, Home, UserRound } from 'lucide-react';
import { getWishlistCount } from '../lib/storageCounts';
import { useTranslation } from '../lib/i18n-client';
import { MobileNavBagIcon } from './icons/MobileNavBagIcon';

const montserratNav = Montserrat({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

type NavKey = 'home' | 'cart' | 'wishlist' | 'profile';

type MobileNavDef =
  | { key: 'cart'; labelKey: string; href: string }
  | { key: Exclude<NavKey, 'cart'>; labelKey: string; href: string; icon: typeof Home };

const INACTIVE_ICON_BOX: Record<NavKey, string> = {
  home: 'h-5 w-5',
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
  wishlistCount: number;
}

function MobileNavItem({ item, active, label, wishlistCount }: MobileNavItemProps) {
  const showWishlistBadge = item.key === 'wishlist' && wishlistCount > 0;

  const iconWrap = (
    <div className="relative flex items-center justify-center">
      <MobileBottomNavIcon item={item} active={active} />
      {showWishlistBadge ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </span>
      ) : null}
    </div>
  );

  const linkClass = active
    ? 'flex h-10 shrink-0 items-center gap-2 rounded-[65px] bg-[rgba(25,158,235,0.1)] px-4 py-2 transition-opacity active:opacity-80'
    : 'relative flex h-10 min-h-0 flex-1 items-center justify-center overflow-hidden py-1 transition-opacity active:opacity-80';

  return (
    <Link
      href={item.href}
      className={linkClass}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
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
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      setWishlistCount(getWishlistCount());
    };

    updateCounts();
    window.addEventListener('wishlist-updated', updateCounts);

    return () => {
      window.removeEventListener('wishlist-updated', updateCounts);
    };
  }, []);

  const items: MobileNavDef[] = useMemo(
    () => [
      { key: 'home', labelKey: 'common.navigation.home', href: '/', icon: Home },
      { key: 'cart', labelKey: 'common.navigation.cart', href: '/cart' },
      { key: 'wishlist', labelKey: 'common.navigation.wishlist', href: '/wishlist', icon: Heart },
      { key: 'profile', labelKey: 'common.navigation.profile', href: '/profile', icon: UserRound },
    ],
    [],
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-white drop-shadow-[0px_0px_20px_rgba(0,0,0,0.15)] lg:hidden">
      <div className="flex w-full items-center justify-center gap-4 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {items.map((item) => (
          <MobileNavItem
            key={item.key}
            item={item}
            active={pathIsActive(pathname, item)}
            label={t(item.labelKey)}
            wishlistCount={wishlistCount}
          />
        ))}
      </div>
    </nav>
  );
}
