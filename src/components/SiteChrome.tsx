'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumb } from './Breadcrumb';
import { Footer } from './Footer';
import { Header } from './Header';
import { MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS } from './mobile-bottom-nav.constants';
import { MobileBottomNav } from './MobileBottomNav';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const showGlobalBreadcrumb = pathname !== '/shop';

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen flex-col ${MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS}`}>
      <Header />
      {showGlobalBreadcrumb && <Breadcrumb />}
      <main className="flex-1 w-full">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
