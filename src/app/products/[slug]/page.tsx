import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readLanguageFromCookies, type LanguageCode } from '@/lib/language';
import { getCachedProductBySlug } from '@/lib/services/products-slug-cached';
import { ProductPageClient } from './ProductPageClient';
import { parseProductSlugParam } from './parse-product-slug-param';
import { parseProductPageColorParam } from '@/lib/products/product-page-href';
import { RESERVED_ROUTES, type Product } from './types';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

function isNotFoundError(error: unknown): boolean {
  return (error as { status?: number }).status === 404;
}

async function loadInitialProduct(
  slug: string,
  locale: LanguageCode,
): Promise<{ product: Product | null; notFound: boolean }> {
  try {
    const { result } = await getCachedProductBySlug(slug, locale);
    return { product: result as Product, notFound: false };
  } catch (error: unknown) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  if (locale !== 'en') {
    try {
      const { result } = await getCachedProductBySlug(slug, 'en');
      return { product: result as Product, notFound: false };
    } catch (fallbackError: unknown) {
      if (isNotFoundError(fallbackError)) {
        return { product: null, notFound: true };
      }
      throw fallbackError;
    }
  }

  return { product: null, notFound: true };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug: rawSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const { slug, variantIdFromUrl } = parseProductSlugParam(rawSlug);
  const colorFromUrl = parseProductPageColorParam(query.color);

  if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) {
    redirect(`/${slug}`);
  }

  const cookieStore = await cookies();
  const initialLocale = readLanguageFromCookies(cookieStore);
  const { product: initialProduct, notFound: initialNotFound } = await loadInitialProduct(
    slug,
    initialLocale,
  );

  return (
    <ProductPageClient
      slug={slug}
      variantIdFromUrl={variantIdFromUrl}
      colorFromUrl={colorFromUrl}
      initialProduct={initialProduct}
      initialLocale={initialLocale}
      initialNotFound={initialNotFound}
    />
  );
}
