'use client';

import Link from 'next/link';
import { CategoryIcon } from './CategoryIcon';
import type { Category } from './utils';

interface Product {
  id: string;
  slug: string;
  title: string;
  image: string | null;
}

interface CategoryItemProps {
  category: Category;
  product: Product | null;
  isActive: boolean;
  currentCategory: string | null;
  onCategoryClick: (categorySlug: string | null) => void;
  t: (path: string) => string;
}

/**
 * Single category item component
 */
export function CategoryItem({
  category,
  product,
  isActive,
  currentCategory,
  onCategoryClick,
  t,
}: CategoryItemProps) {
  const title = category.title;
  const slug = category.slug;
  
  // Determine label text
  let labelText = title;
  if (slug === 'all') {
    labelText = t('products.categoryNavigation.shopAll');
  } else if (title.toLowerCase().includes('new')) {
    labelText = t('products.categoryNavigation.newArrivals');
  } else if (title.toLowerCase().includes('sale')) {
    labelText = t('products.categoryNavigation.sale');
  }

  return (
    <Link
      href={category.slug === 'all' ? '/products' : `/products?category=${category.slug}`}
      onClick={(e) => {
        e.preventDefault();
        onCategoryClick(category.slug === 'all' ? null : category.slug);
      }}
      className="flex flex-col items-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-[100px] group cursor-pointer transition-all duration-200 hover:opacity-80"
    >
      {/* Category Icon/Image */}
      <div className="relative">
        <CategoryIcon
          category={category}
          product={product}
          isActive={isActive}
          t={t}
        />
      </div>
      
      {/* Category Label */}
      <span className={`text-[10px] sm:text-xs text-center font-medium leading-tight transition-colors ${
        isActive 
          ? 'text-gray-900 underline' 
          : 'text-gray-700'
      }`}>
        {labelText}
      </span>
    </Link>
  );
}




