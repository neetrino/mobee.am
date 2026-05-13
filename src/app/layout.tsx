import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '../components/ClientProviders';
import { SiteChrome } from '../components/SiteChrome';
import {
  SITE_APP_ICON_PATH,
  SITE_BRAND_NAME,
  SITE_SHARE_DESCRIPTION,
  SITE_SHARE_TITLE,
} from '../lib/brand.constants';
import { readLanguageFromCookies } from '../lib/language';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
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
  const cookieStore = await cookies();
  const initialLanguage = readLanguageFromCookies(cookieStore);

  return (
    <html lang={initialLanguage} className="h-full">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-full`}>
        <Suspense fallback={null}>
          <ClientProviders initialLanguage={initialLanguage}>
            <SiteChrome>{children}</SiteChrome>
          </ClientProviders>
        </Suspense>
      </body>
    </html>
  );
}

