'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Heart, Home, ShoppingBag, UserRound } from 'lucide-react';
import { getWishlistCount } from '../lib/storageCounts';
import { useTranslation } from '../lib/i18n-client';

type NavKey = 'home' | 'cart' | 'wishlist' | 'profile';

interface MobileNavDef {
  key: NavKey;
  labelKey: string;
  href: string;
  icon: typeof Home;
}

/**
 * Mobile bottom bar aligned with Figma mobee-new (home pill, bag, wishlist, profile).
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
      { key: 'cart', labelKey: 'common.navigation.cart', href: '/cart', icon: ShoppingBag },
      { key: 'wishlist', labelKey: 'common.navigation.wishlist', href: '/wishlist', icon: Heart },
      { key: 'profile', labelKey: 'common.navigation.profile', href: '/profile', icon: UserRound },
    ],
    [],
  );

  const pathIsActive = (item: MobileNavDef) => {
    if (item.key === 'home') {
      return pathname === '/';
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-0 bg-white shadow-[0_0_20px_rgba(0,0,0,0.15)] lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        {items.map((item) => {
          const active = pathIsActive(item);
          const Icon = item.icon;
          const label = t(item.labelKey);

          const inner = (
            <>
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? 'text-[#2db2ff]' : 'text-gray-500'}`}
                  strokeWidth={active && item.key === 'home' ? 2.5 : 2}
                  aria-hidden
                />
                {item.key === 'wishlist' && wishlistCount > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                ) : null}
              </div>
              {active && item.key === 'home' ? (
                <span className="text-sm font-normal leading-none text-[#2db2ff]">{label}</span>
              ) : null}
            </>
          );

          const pillClass =
            active && item.key === 'home'
              ? 'flex items-center gap-2 rounded-[65px] bg-[rgba(25,158,235,0.1)] px-4 py-2'
              : 'flex h-10 flex-1 items-center justify-center rounded-2xl py-1';

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`${pillClass} min-w-0 transition-opacity active:opacity-80`}
              aria-label={item.key === 'home' && active ? label : label}
              aria-current={active ? 'page' : undefined}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
