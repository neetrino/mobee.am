import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { ClientProviders } from '../components/ClientProviders';
import { SiteChrome } from '../components/SiteChrome';
import { siteInter } from '../lib/fonts/site-fonts';
import {
  SITE_APP_ICON_PATH,
  SITE_BRAND_NAME,
  SITE_SHARE_DESCRIPTION,
  SITE_SHARE_TITLE,
} from '../lib/brand.constants';
import { readLanguageFromCookies } from '../lib/language';
import type { CategoryTreeNode } from '../lib/category-nav';
import { getCachedCategoriesTree } from '../lib/services/categories-tree-cached';
import { TABLET_IPAD_AIR_LIKE_HTML_INIT_SCRIPT } from '../lib/tablet-ipad-air-like-layout';
import { withRootLayoutDevTiming } from '../lib/root-layout-dev-timing';

const inter = siteInter;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  /** Stops iOS Safari from injecting tel links into text/DOM and breaking React hydration. */
  formatDetection: {
    telephone: false,
  },
  title: {
    default: SITE_BRAND_NAME,
    template: `%s | ${SITE_BRAND_NAME}`,
  },
  description: SITE_SHARE_DESCRIPTION,
  icons: {
    icon: SITE_APP_ICON_PATH,
    apple: SITE_APP_ICON_PATH,
  },
  openGraph: {
    title: SITE_SHARE_TITLE,
    description: SITE_SHARE_DESCRIPTION,
    siteName: SITE_BRAND_NAME,
    locale: 'hy_AM',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_SHARE_TITLE,
    description: SITE_SHARE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialLanguage, categoriesTree } = await withRootLayoutDevTiming(
    async () => {
      const cookieStore = await cookies();
      const initialLanguage = readLanguageFromCookies(cookieStore);
      const headersList = await headers();
      const isAdminRoute = headersList.get('x-mobee-admin-route') === '1';
      const categoriesTree = isAdminRoute
        ? { data: [] as CategoryTreeNode[] }
        : (await getCachedCategoriesTree(initialLanguage)).result;

      return { initialLanguage, categoriesTree, isAdminRoute };
    },
    (result) => ({ isAdminRoute: result.isAdminRoute }),
  );

  return (
    <html lang={initialLanguage} className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: TABLET_IPAD_AIR_LIKE_HTML_INIT_SCRIPT }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-full`}>
        <Suspense fallback={null}>
          <ClientProviders
            initialLanguage={initialLanguage}
            initialCategories={categoriesTree.data}
          >
            <SiteChrome>{children}</SiteChrome>
          </ClientProviders>
        </Suspense>
      </body>
    </html>
  );
}

