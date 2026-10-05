'use client';

import { PriceFilter } from '@/components/PriceFilter';
import { CategoryFilter } from '@/components/CategoryFilter';
import { BrandFilter } from '@/components/BrandFilter';
import { ColorFilter } from '@/components/ColorFilter';
import { SizeFilter } from '@/components/SizeFilter';
import { AttributeFiltersList } from '@/components/AttributeFilter';
import { SHOP_FILTER_SECTIONS_STACK_CLASS } from '@/app/[locale]/shop/shop-layout.constants';

export type ShopFilterSectionsProps = {
  currentMinPrice?: string;
  currentMaxPrice?: string;
  category?: string;
  search?: string;
  selectedCategories: string[];
  selectedBrands: string[];
  selectedColors: string[];
  selectedSizes: string[];
  selectedAttrs: Record<string, string[]>;
  padded?: boolean;
};

/**
 * Order: Categories → Brands → Price → Colors → Sizes → Attributes.
 */
export function ShopFilterSections({
  currentMinPrice,
  currentMaxPrice,
  category,
  search,
  selectedCategories,
  selectedBrands,
  selectedColors,
  selectedSizes,
  selectedAttrs,
  padded = false,
}: ShopFilterSectionsProps) {
  return (
    <div
      data-shop-filter-sections
      className={`${SHOP_FILTER_SECTIONS_STACK_CLASS}${padded ? ' p-4' : ''}`}
    >
      <CategoryFilter
        selectedCategories={selectedCategories}
        search={search}
        minPrice={currentMinPrice}
        maxPrice={currentMaxPrice}
      />
      <BrandFilter
        category={category}
        search={search}
        minPrice={currentMinPrice}
        maxPrice={currentMaxPrice}
        selectedBrands={selectedBrands}
      />
      <PriceFilter
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        category={category}
        search={search}
      />
      <ColorFilter
        category={category}
        search={search}
        minPrice={currentMinPrice}
        maxPrice={currentMaxPrice}
        selectedColors={selectedColors}
      />
      <SizeFilter selectedSizes={selectedSizes} />
      <AttributeFiltersList selectedAttrs={selectedAttrs} />
    </div>
  );
}
