'use client';

import Image from 'next/image';
import { getCategoryIcon, type Category } from './utils';

interface Product {
  id: string;
  slug: string;
  title: string;
  image: string | null;
}

interface CategoryIconProps {
  category: Category;
  product: Product | null;
  isActive: boolean;
  t: (path: string) => string;
}

/**
 * Component for displaying category icon/image
 */
export function CategoryIcon({ category, product, isActive, t }: CategoryIconProps) {
  const title = category.title.toLowerCase();
  const slug = category.slug.toLowerCase();

  // Special categories (all, new, sale) use getCategoryIcon
  if (slug === 'all' || title.includes('new') || title.includes('sale')) {
    return <>{getCategoryIcon(category.title, category.slug, isActive, t)}</>;
  }

  // Regular categories show product image or placeholder
  return (
    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 flex items-center justify-center overflow-hidden transition-all ${
      isActive ? 'border-gray-400 shadow-md' : 'border-gray-200'
    }`}>
      {product?.image ? (
        <Image
          src={product.image}
          alt={category.title}
          width={80}
          height={80}
          className="w-full h-full object-cover"
          unoptimized
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      )}
    </div>
  );
}




