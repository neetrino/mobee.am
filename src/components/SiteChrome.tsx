'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumb } from './Breadcrumb';
import { Footer } from './Footer';
import { Header } from './Header';
import { MainHeaderBar } from './MainHeaderBar';
import { MobileBottomNav } from './MobileBottomNav';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <Header />
      <MainHeaderBar />
      <Breadcrumb />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
