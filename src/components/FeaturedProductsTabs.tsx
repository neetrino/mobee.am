'use client';

import { useCallback } from 'react';
import { FeaturedBestChoiceGrid } from './FeaturedBestChoiceGrid';
import { SpecialOffersSectionHeading } from './SpecialOffersSectionHeading';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { t } from '../lib/i18n';
import { FEATURED_HOME_FILTER_DEFAULT, useFeaturedHomeProducts } from './useFeaturedHomeProducts';

/**
 * Featured products grid for the home page (single curated list).
 */
export function FeaturedProductsTabs() {
  const { language, products, loading, error, fetchProducts, productsPerPage } =
    useFeaturedHomeProducts();

  const onRetry = useCallback(() => {
    fetchProducts(FEATURED_HOME_FILTER_DEFAULT);
  }, [fetchProducts]);

  return (
    <section className="bg-gray-50 pb-16 pt-6" aria-labelledby="featured-products-tabs">
      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        <h2 id="featured-products-tabs" className="sr-only">
          {t(language, 'home.featured_products.title')}
        </h2>

        <FeaturedBestChoiceGrid
          language={language}
          loading={loading}
          error={error}
          products={products}
          productsPerPage={productsPerPage}
          onRetry={onRetry}
        />

        <SpecialOffersSectionHeading />
      </div>
    </section>
  );
}
