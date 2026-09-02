import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CategoriesTreeProvider } from '@/components/CategoriesTreeContext';
import { SiteChrome } from '@/components/SiteChrome';
import { UiLanguageProvider } from '@/components/UiLanguageProvider';
import {
  SITE_BRAND_NAME,
  SITE_SHARE_DESCRIPTION,
  SITE_SHARE_IMAGE_HEIGHT_PX,
  SITE_SHARE_IMAGE_PATH,
  SITE_SHARE_IMAGE_WIDTH_PX,
  SITE_SHARE_TITLE,
} from '@/lib/brand.constants';
import {
  APP_LOCALES,
  STOREFRONT_OG_LOCALE,
  asLanguageCode,
  isAppLocale,
  type AppLocale,
} from '@/lib/i18n/routing';
import { setRequestLocale } from '@/lib/i18n/request-locale';
import { getLayoutCategoriesTree } from '@/lib/services/categories-tree-cached';
import { getSiteAssetUrl } from '@/lib/site-url';
import { LocalePreferenceSync } from './LocalePreferenceSync';
import { StorefrontLocalePrefetch } from './StorefrontLocalePrefetch';

export const dynamicParams = false;

export function generateStaticParams(): Array<{ locale: AppLocale }> {
  return APP_LOCALES.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Re-emit full openGraph here: Next.js replaces parent `openGraph` when a child
 * sets any openGraph fields, so locale-only overrides would drop `og:image`.
 */
export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    return {};
  }
  return {
    openGraph: {
      title: SITE_SHARE_TITLE,
      description: SITE_SHARE_DESCRIPTION,
      siteName: SITE_BRAND_NAME,
      locale: STOREFRONT_OG_LOCALE[locale],
      type: 'website',
      images: [
        {
          url: getSiteAssetUrl(SITE_SHARE_IMAGE_PATH),
          width: SITE_SHARE_IMAGE_WIDTH_PX,
          height: SITE_SHARE_IMAGE_HEIGHT_PX,
          alt: SITE_BRAND_NAME,
        },
      ],
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  if (!isAppLocale(rawLocale)) {
    notFound();
  }

  setRequestLocale(rawLocale);
  const language = asLanguageCode(rawLocale);
  const categoriesTree = await getLayoutCategoriesTree(language);

  return (
    <UiLanguageProvider initialLanguage={language}>
      <CategoriesTreeProvider
        initialCategories={categoriesTree.data}
        initialLanguage={language}
      >
        <LocalePreferenceSync locale={language} />
        <Suspense fallback={null}>
          <StorefrontLocalePrefetch />
        </Suspense>
        <SiteChrome>{children}</SiteChrome>
      </CategoriesTreeProvider>
    </UiLanguageProvider>
  );
}
