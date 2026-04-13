import type { ReactNode } from 'react';

export interface Category {
  id: string;
  slug: string;
  title: string;
  fullPath: string;
  children: Category[];
}

/**
 * Flatten categories tree to get all categories
 */
export function flattenCategories(cats: Category[]): Category[] {
  const result: Category[] = [];
  cats.forEach((cat) => {
    result.push(cat);
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children));
    }
  });
  return result;
}

/**
 * Get category icon based on title/slug
 */
export function getCategoryIcon(
  categoryTitle: string,
  categorySlug: string,
  isActive: boolean,
  t: (path: string) => string
): ReactNode {
  const title = categoryTitle.toLowerCase();
  const slug = categorySlug.toLowerCase();

  // ALL category - grey circle
  if (title === 'all' || slug === 'all') {
    return (
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all ${
        isActive ? 'bg-gray-300' : 'bg-gray-200'
      }`}>
        <span className="text-xs sm:text-sm font-bold text-gray-900">{t('products.categoryNavigation.labels.all')}</span>
      </div>
    );
  }

  // NEW category - green circle
  if (title.includes('new') || slug.includes('new')) {
    return (
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all ${
        isActive ? 'bg-green-200' : 'bg-green-100'
      }`}>
        <span className="text-xs sm:text-sm font-bold text-green-700">{t('products.categoryNavigation.labels.new')}</span>
      </div>
    );
  }

  // SALE category - red circle
  if (title.includes('sale') || slug.includes('sale')) {
    return (
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all ${
        isActive ? 'bg-red-200' : 'bg-red-100'
      }`}>
        <span className="text-xs sm:text-sm font-bold text-red-700">{t('products.categoryNavigation.labels.sale')}</span>
      </div>
    );
  }

  // Default - white circle (will be filled with product image if available)
  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden">
      {/* Product image will be inserted here if available */}
    </div>
  );
}




