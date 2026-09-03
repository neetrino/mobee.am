import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ClientProviders } from '../components/ClientProviders';
import { siteInter } from '../lib/fonts/site-fonts';
import {
  SITE_APP_ICON_PATH,
  SITE_BRAND_NAME,
  SITE_SHARE_DESCRIPTION,
  SITE_SHARE_IMAGE_HEIGHT_PX,
  SITE_SHARE_IMAGE_PATH,
  SITE_SHARE_IMAGE_WIDTH_PX,
  SITE_SHARE_TITLE,
} from '../lib/brand.constants';
import { DEFAULT_LANGUAGE, STOREFRONT_LANGUAGE_INIT_SCRIPT } from '../lib/language';
import { getSiteAssetUrl, getSiteUrl } from '../lib/site-url';
import { TABLET_IPAD_AIR_LIKE_HTML_INIT_SCRIPT } from '../lib/tablet-ipad-air-like-layout';

const inter = siteInter;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const siteShareImage = {
  url: getSiteAssetUrl(SITE_SHARE_IMAGE_PATH),
  width: SITE_SHARE_IMAGE_WIDTH_PX,
  height: SITE_SHARE_IMAGE_HEIGHT_PX,
  alt: SITE_BRAND_NAME,
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
    images: [siteShareImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_SHARE_TITLE,
    description: SITE_SHARE_DESCRIPTION,
    images: [getSiteAssetUrl(SITE_SHARE_IMAGE_PATH)],
  },
};

/**
 * Static shell: no cookies()/headers(). Storefront locale lives in `/[locale]/...`.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialLanguage = DEFAULT_LANGUAGE;

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
          <ClientProviders initialLanguage={initialLanguage}>{children}</ClientProviders>
        </Suspense>
      </body>
    </html>
  );
}
