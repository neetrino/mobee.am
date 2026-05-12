'use client';

import { usePathname } from 'next/navigation';
import { isProfileRoutePath } from '../lib/profile-route.utils';
import { Footer } from './Footer';
import { Header } from './Header';
import { CartFlyAnimationLayer } from './CartFlyAnimationLayer';
import { MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS } from './mobile-bottom-nav.constants';
import { MobileBottomNav } from './MobileBottomNav';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/supersudo') ?? false;
  const hideMobileHeaderOnProfile = isProfileRoutePath(pathname ?? null);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen flex-col ${MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS}`}>
      {hideMobileHeaderOnProfile ? (
        <div className="max-lg:hidden">
          <Header />
        </div>
      ) : (
        <Header />
      )}
      <CartFlyAnimationLayer />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
