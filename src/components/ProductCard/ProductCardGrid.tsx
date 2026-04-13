'use client';

import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { CartIcon as CartPngIcon } from '../icons/CartIcon';
import { useTranslation } from '../../lib/i18n-client';
import type { CurrencyCode } from '../../lib/currency';
import type { ProductLabel } from '../ProductLabels';

interface ProductCardGridProps {
  product: {
    id: string;
    slug: string;
    title: string;
    price: number;
    image: string | null;
    inStock: boolean;
    brand: { id: string; name: string } | null;
    labels?: ProductLabel[];
    compareAtPrice?: number | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
  };
  currency: CurrencyCode;
  isInWishlist: boolean;
  isInCompare: boolean;
  isAddingToCart: boolean;
  imageError: boolean;
  isCompact?: boolean;
  onImageError: () => void;
  onWishlistToggle: (e: MouseEvent) => void;
  onCompareToggle: (e: MouseEvent) => void;
  onAddToCart: (e: MouseEvent) => void;
}

/**
 * Grid view layout for ProductCard
 */
export function ProductCardGrid({
  product,
  currency,
  isInWishlist,
  isInCompare,
  isAddingToCart,
  imageError,
  isCompact = false,
  onImageError,
  onWishlistToggle,
  onCompareToggle,
  onAddToCart,
}: ProductCardGridProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative group">
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        <ProductCardImage
          slug={product.slug}
          image={product.image}
          title={product.title}
          labels={product.labels}
          imageError={imageError}
          onImageError={onImageError}
          isCompact={isCompact}
        />
        
        {/* Action Icons - appear on hover */}
        <ProductCardActions
          isInWishlist={isInWishlist}
          isInCompare={isInCompare}
          isAddingToCart={isAddingToCart}
          inStock={product.inStock}
          isCompact={isCompact}
          onWishlistToggle={onWishlistToggle}
          onCompareToggle={onCompareToggle}
          onAddToCart={onAddToCart}
          showOnHover
        />
      </div>
      
      {/* Product Info */}
      <ProductCardInfo
        slug={product.slug}
        title={product.title}
        brandName={product.brand?.name}
        price={product.price}
        originalPrice={product.originalPrice}
        compareAtPrice={product.compareAtPrice}
        discountPercent={product.discountPercent}
        currency={currency}
        colors={product.colors}
        isCompact={isCompact}
      />

      {/* Cart Button in Price Row */}
      <div className={`px-4 pb-4 flex items-center justify-end ${isCompact ? 'gap-2' : 'gap-4'}`}>
        <button
          onClick={onAddToCart}
          disabled={!product.inStock || isAddingToCart}
          className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center transition-all duration-200 ${
            product.inStock && !isAddingToCart
              ? 'bg-transparent text-gray-600 hover:bg-green-600 hover:text-white hover:shadow-md'
              : 'bg-transparent text-gray-400 cursor-not-allowed'
          }`}
          title={product.inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
          aria-label={product.inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')}
        >
          {isAddingToCart ? (
            <svg className={`animate-spin ${isCompact ? 'h-5 w-5' : 'h-6 w-6'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <CartPngIcon size={isCompact ? 18 : 24} />
          )}
        </button>
      </div>
    </div>
  );
}

