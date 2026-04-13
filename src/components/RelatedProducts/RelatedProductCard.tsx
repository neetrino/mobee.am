'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { MouseEvent } from 'react';
import { formatPrice } from '../../lib/currency';
import { CartIcon as CartPngIcon } from '../icons/CartIcon';
import type { CurrencyCode } from '../../lib/currency';
import type { LanguageCode } from '../../lib/language';
import { t } from '../../lib/i18n';

interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  compareAtPrice: number | null;
  discountPercent?: number | null;
  image: string | null;
  inStock: boolean;
  brand?: {
    id: string;
    name: string;
  } | null;
  categories?: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
}

interface RelatedProductCardProps {
  product: RelatedProduct;
  currency: CurrencyCode;
  language: LanguageCode;
  isAddingToCart: boolean;
  hasMoved: boolean;
  onAddToCart: (e: MouseEvent, product: RelatedProduct) => void;
  onImageError: (productId: string) => void;
  imageError: boolean;
  width: string;
}

/**
 * Single product card component for RelatedProducts carousel
 */
export function RelatedProductCard({
  product,
  currency,
  language,
  isAddingToCart,
  hasMoved,
  onAddToCart,
  onImageError,
  imageError,
  width,
}: RelatedProductCardProps) {
  const hasImage = product.image && !imageError;
  const categoryName = product.categories && product.categories.length > 0 
    ? product.categories.map(c => c.title).join(', ')
    : product.brand?.name || 'Product';

  return (
    <div
      className="flex-shrink-0 px-3 h-full"
      style={{ width }}
    >
      <div className="group relative h-full flex flex-col">
        <Link
          href={`/products/${product.slug}`}
          className="block cursor-pointer flex-1 flex flex-col"
          onClick={(e) => {
            // Prevent navigation only if we actually dragged (moved more than threshold)
            if (hasMoved) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            console.log('[RelatedProducts] Navigating to product:', product.slug);
          }}
        >
          <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
            {/* Product Image */}
            <div className="relative aspect-square bg-gray-100 overflow-hidden flex-shrink-0">
              {hasImage ? (
                <Image
                  src={product.image!}
                  alt={product.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  unoptimized
                  onError={() => onImageError(product.id)}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">{t(language, 'common.messages.noImage')}</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 flex flex-col flex-1">
              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-gray-600 transition-colors">
                {product.title}
              </h3>

              {/* Category */}
              <p className="text-xs text-gray-500 mb-3">
                {categoryName}
              </p>

              {/* Price */}
              <div className="flex flex-col gap-1 mt-auto">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(product.price, currency)}
                  </span>
                  {product.discountPercent && product.discountPercent > 0 && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      -{product.discountPercent}%
                    </span>
                  )}
                </div>
                {(product.originalPrice && product.originalPrice > product.price) || 
                 (product.compareAtPrice && product.compareAtPrice > product.price) ? (
                  <span className="text-sm text-gray-500 line-through decoration-gray-400">
                    {formatPrice(
                      (product.originalPrice && product.originalPrice > product.price) 
                        ? product.originalPrice 
                        : (product.compareAtPrice || 0),
                      currency
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Link>

        {/* Cart Icon Button */}
        <button
          onClick={(e) => onAddToCart(e, product)}
          disabled={!product.inStock || isAddingToCart}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-20 group/cart"
          title={product.inStock ? 'Add to cart' : 'Out of stock'}
          aria-label={product.inStock ? 'Add to cart' : 'Out of stock'}
        >
          {isAddingToCart ? (
            <svg className="animate-spin h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <div className={`transition-colors duration-200 ${product.inStock ? 'text-gray-600 group-hover/cart:text-green-600' : 'text-gray-400'}`}>
              <CartPngIcon size={24} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}




