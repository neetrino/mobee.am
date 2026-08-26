'use client';

import { useMemo } from 'react';
import { t } from '@/lib/i18n';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { getProductDescriptionHtml } from '@/lib/products/get-product-description-html';
import { extractProductDescriptionSpecs } from '@/lib/products/extract-product-description-specs';
import { buildPdpSpecLayout } from '@/lib/products/build-pdp-spec-layout';
import { resolveProductCardImageSrc } from '@/lib/productCardDisplayImage';
import type { LanguageCode } from '@/lib/language';
import type { Product } from './types';
import { ProductDescriptionDesktop } from './product-description/ProductDescriptionDesktop';

interface ProductDescriptionSectionProps {
  product: Product;
  language: LanguageCode;
  mainImageUrl?: string | null;
}

export function ProductDescriptionSection({
  product,
  language,
  mainImageUrl,
}: ProductDescriptionSectionProps) {
  const { specsResult, layout, fullHtml } = useMemo(() => {
    const descriptionSources = {
      description: product.description,
      sourceDescription: product.sourceDescription,
    };
    const extracted = extractProductDescriptionSpecs(language, product.id, descriptionSources);
    const layoutResult = buildPdpSpecLayout(extracted.sections);
    const html = getProductDescriptionHtml(language, product.id, descriptionSources);

    return {
      specsResult: extracted,
      layout: layoutResult,
      fullHtml: html,
    };
  }, [language, product]);

  const resolvedImageUrl = resolveProductCardImageSrc(mainImageUrl ?? product.image);
  const showDesktopCards = specsResult.hasSpecs && layout.hasLayout;
  const proseClassName =
    'product-description-content prose prose-sm max-w-none break-words text-gray-600 [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto';

  if (!fullHtml.trim()) {
    return null;
  }

  return (
    <section
      id="product-long-description"
      className="mt-16 min-w-0 scroll-mt-24 overflow-x-hidden border-t border-gray-200 pt-12 max-lg:pb-6 lg:max-w-none"
    >
      <h2 className="mb-6 text-2xl font-semibold text-gray-900 lg:mb-8 lg:text-[1.75rem]">
        {t(language, 'product.description_title')}
      </h2>

      {showDesktopCards ? (
        <ProductDescriptionDesktop
          layout={layout}
          language={language}
          productId={product.id}
          productTitle={product.title}
          imageUrl={resolvedImageUrl}
        />
      ) : (
        <div
          className={`${proseClassName} lg:max-w-3xl`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(fullHtml) }}
        />
      )}
    </section>
  );
}
