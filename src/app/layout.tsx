import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
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
import { DEFAULT_LANGUAGE, STOREFRONT_LANGUAGE_INIT_SCRIPT } from '../lib/language';
import { getLayoutCategoriesTree } from '../lib/services/categories-tree-cached';
import { TABLET_IPAD_AIR_LIKE_HTML_INIT_SCRIPT } from '../lib/tablet-ipad-air-like-layout';

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

/**
 * Static shell: no cookies()/headers(). Language is default on the server;
 * ClientProviders + STOREFRONT_LANGUAGE_INIT_SCRIPT re-localize in the browser.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialLanguage = DEFAULT_LANGUAGE;
  const categoriesTree = await getLayoutCategoriesTree(initialLanguage);

  return (
    <html lang={initialLanguage} className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: TABLET_IPAD_AIR_LIKE_HTML_INIT_SCRIPT }}
        />
        <Script id="lang-init" strategy="beforeInteractive">
          {STOREFRONT_LANGUAGE_INIT_SCRIPT}
        </Script>
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
