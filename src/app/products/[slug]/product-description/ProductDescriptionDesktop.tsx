import type { LanguageCode } from '@/lib/language';
import { t, getProductText } from '@/lib/i18n';
import type { PdpSpecLayout } from '@/lib/products/build-pdp-spec-layout';
import { ProductSpecCard } from './ProductSpecCard';
import { ProductHeroCard } from './ProductHeroCard';

interface ProductDescriptionDesktopProps {
  layout: PdpSpecLayout;
  language: LanguageCode;
  productId: string;
  productTitle: string;
  imageUrl: string | null;
}

export function ProductDescriptionDesktop({
  layout,
  language,
  productId,
  productTitle,
  imageUrl,
}: ProductDescriptionDesktopProps) {
  const imageAlt = getProductText(language, productId, 'title') || productTitle;

  return (
    <div className="space-y-4 [direction:ltr]">
      {layout.hasLayout ? (
        <ProductHeroCard
          imageAlt={imageAlt}
          imageUrl={imageUrl}
          rows={layout.heroRows}
          language={language}
        />
      ) : null}

      {layout.memoryRows.length > 0 || layout.connectivityRows.length > 0 ? (
        <div
          className={
            layout.memoryRows.length > 0 && layout.connectivityRows.length > 0
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
              : 'grid grid-cols-1 gap-4'
          }
        >
          <ProductSpecCard
            title={t(language, 'product.specs.sections.memory')}
            rows={layout.memoryRows}
            language={language}
            sectionSlug="memory"
          />
          <ProductSpecCard
            title={t(language, 'product.specs.sections.connectivity')}
            rows={layout.connectivityRows}
            language={language}
            sectionSlug="connectivity"
          />
        </div>
      ) : null}

      {layout.additionalRows.length > 0 ? (
        <ProductSpecCard
          title={t(language, 'product.specs.sections.security')}
          rows={layout.additionalRows}
          language={language}
          sectionSlug="security"
        />
      ) : null}
    </div>
  );
}
