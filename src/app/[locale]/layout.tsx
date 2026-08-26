import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoriesTreeProvider } from '@/components/CategoriesTreeContext';
import { SiteChrome } from '@/components/SiteChrome';
import { UiLanguageProvider } from '@/components/UiLanguageProvider';
import {
  APP_LOCALES,
  STOREFRONT_OG_LOCALE,
  asLanguageCode,
  isAppLocale,
  type AppLocale,
} from '@/lib/i18n/routing';
import { setRequestLocale } from '@/lib/i18n/request-locale';
import { getLayoutCategoriesTree } from '@/lib/services/categories-tree-cached';
import { LocalePreferenceSync } from './LocalePreferenceSync';

export const dynamicParams = false;

export function generateStaticParams(): Array<{ locale: AppLocale }> {
  return APP_LOCALES.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    return {};
  }
  return {
    openGraph: {
      locale: STOREFRONT_OG_LOCALE[locale],
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
    <UiLanguageProvider key={language} initialLanguage={language}>
      <CategoriesTreeProvider
        key={language}
        initialCategories={categoriesTree.data}
        initialLanguage={language}
      >
        <LocalePreferenceSync locale={language} />
        <SiteChrome>{children}</SiteChrome>
      </CategoriesTreeProvider>
    </UiLanguageProvider>
  );
}
