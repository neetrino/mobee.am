import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '../components/ClientProviders';
import { SiteChrome } from '../components/SiteChrome';
import { SITE_APP_ICON_PATH } from '../lib/brand.constants';
import { readLanguageFromCookies } from '../lib/language';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shop - Professional E-commerce',
  description: 'Modern e-commerce platform',
  icons: {
    icon: SITE_APP_ICON_PATH,
    apple: SITE_APP_ICON_PATH,
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

