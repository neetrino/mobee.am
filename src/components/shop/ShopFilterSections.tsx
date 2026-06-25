'use client';

import { PriceFilter } from '@/components/PriceFilter';
import { CategoryFilter } from '@/components/CategoryFilter';
import { BrandFilter } from '@/components/BrandFilter';
import { ColorFilter } from '@/components/ColorFilter';
import { SHOP_FILTER_SECTIONS_STACK_CLASS } from '@/app/shop/shop-layout.constants';

export type ShopFilterSectionsProps = {
  currentMinPrice?: string;
  currentMaxPrice?: string;
  category?: string;
  search?: string;
  selectedCategories: string[];
  selectedBrands: string[];
  selectedColors: string[];
  padded?: boolean;
};

export function ShopFilterSections({
  currentMinPrice,
  currentMaxPrice,
  category,
  search,
  selectedCategories,
  selectedBrands,
  selectedColors,
  padded = false,
}: ShopFilterSectionsProps) {
  return (
    <div className={`${SHOP_FILTER_SECTIONS_STACK_CLASS}${padded ? ' p-4' : ''}`}>
      <PriceFilter
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        category={category}
        search={search}
      />
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
      <ColorFilter
        category={category}
        search={search}
        minPrice={currentMinPrice}
        maxPrice={currentMaxPrice}
        selectedColors={selectedColors}
      />
    </div>
  );
}
