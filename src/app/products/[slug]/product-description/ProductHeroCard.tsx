import Image from 'next/image';
import type { LanguageCode } from '@/lib/language';
import { t } from '@/lib/i18n';
import type { ProductDescriptionSpecRow } from '@/lib/products/extract-product-description-specs';
import { ProductSpecRow } from './ProductSpecCard';
import { getProductSpecSectionIcon, getProductSpecSectionIconClassName } from './product-spec-row-icon';
import { PRODUCT_DESCRIPTION_CARD_CLASS } from './product-description.constants';

const HERO_GRID_CLASS =
  'grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)] items-start gap-8 [direction:ltr]';

interface ProductHeroCardProps {
  imageAlt: string;
  imageUrl: string;
  rows: ProductDescriptionSpecRow[];
  language: LanguageCode;
}

function filterHeroRows(rows: ProductDescriptionSpecRow[], imageAlt: string): ProductDescriptionSpecRow[] {
  const normalizedTitle = imageAlt.trim().toLowerCase();

  return rows.filter((row) => {
    if (row.labelKey === 'product.specs.labels.model') {
      return false;
    }

    if (row.labelKey === 'product.specs.labels.announcementYear') {
      return false;
    }

    return row.value.trim().toLowerCase() !== normalizedTitle;
  });
}

export function ProductHeroCard({ imageAlt, imageUrl, rows, language }: ProductHeroCardProps) {
  const visibleRows = filterHeroRows(rows, imageAlt);
  const HeroIcon = getProductSpecSectionIcon('general');
  const heroIconClassName = getProductSpecSectionIconClassName('general');

  return (
    <article className={PRODUCT_DESCRIPTION_CARD_CLASS}>
      <div className={HERO_GRID_CLASS}>
        <div className="col-start-1 row-start-1 flex flex-col items-center">
          <div className="relative aspect-square w-full max-w-[220px]">
            <Image src={imageUrl} alt={imageAlt} fill className="object-contain" sizes="220px" />
          </div>
        </div>

        {visibleRows.length > 0 ? (
          <div className="col-start-2 row-start-1 min-w-0">
            <header className="mb-4 flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${heroIconClassName}`}
              >
                <HeroIcon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-base font-bold text-gray-900">
                {t(language, 'product.specs.sections.general')}
              </h3>
            </header>
            <div>
              {visibleRows.map((row) => (
                <ProductSpecRow
                  key={`${row.labelKey ?? row.label}-${row.value}`}
                  row={row}
                  language={language}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
