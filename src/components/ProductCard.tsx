'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useWishlist } from './hooks/useWishlist';
import { useCompare } from './hooks/useCompare';
import { resolveProductCardImageSrc } from '../lib/productCardDisplayImage';
import { useAddToCart } from './hooks/useAddToCart';
import { useCurrency } from './hooks/useCurrency';
import { resolveCompareCategoryId } from '../lib/shop/compare-storage';
import { ProductCardList } from './ProductCard/ProductCardList';
import { ProductCardGrid } from './ProductCard/ProductCardGrid';

interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  price: number;
  image: string | null;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
  } | null;
  defaultVariantId?: string | null;
  labels?: import('./ProductLabels').ProductLabel[];
  compareAtPrice?: number | null;
  originalPrice?: number | null;
  globalDiscount?: number | null;
  discountPercent?: number | null;
  colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  categories?: Array<{ id: string; slug?: string; title?: string }>;
}

type ViewMode = 'list' | 'grid-2' | 'grid-3';

interface ProductCardProps {
  product: Product;
  viewMode?: ViewMode;
  /** Nudge product art in the frame (e.g. home “best choice” grid). */
  shiftImageInFrame?: boolean;
  /** Use a square image frame; set false for portrait 3:4. */
  squareImageFrame?: boolean;
  /** Smaller footer price (e.g. home “best choice” grid). */
  smallerFooterPrice?: boolean;
  /** Home special-offers grid — RU desktop footer CTA uses Figma 155.99×36.94px. */
  specialOffersHomeCard?: boolean;
  /** Home featured / special-offer grids — mobile Figma card chrome. */
  homeProductGridCard?: boolean;
  imageLoadPriority?: boolean;
}

/**
 * Product card component with Compare, Wishlist and Cart icons
 * Displays product image, title, category, price and action buttons
 */
export function ProductCard({
  product,
  viewMode = 'grid-3',
  shiftImageInFrame = false,
  squareImageFrame = true,
  smallerFooterPrice = false,
  specialOffersHomeCard = false,
  homeProductGridCard = false,
  imageLoadPriority = false,
}: ProductCardProps) {
  const isCompact = viewMode === 'grid-3';
  const currency = useCurrency();
  const { isInWishlist, toggleWishlist } = useWishlist(product.id);
  const compareCategoryId = resolveCompareCategoryId(product);
  const { isInCompare, toggleCompare } = useCompare(product.id, compareCategoryId);
  const { isAddingToCart, addToCart } = useAddToCart({
    productId: product.id,
    productSlug: product.slug,
    inStock: product.inStock,
    defaultVariantId: product.defaultVariantId ?? undefined,
    price: product.price,
  });
  const [imageError, setImageError] = useState(false);

  const handleWishlistToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist();
  };

  // Handle compare toggle
  const handleCompareToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare();
  };

  // Handle add to cart
  const handleAddToCart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const root = (e.currentTarget as HTMLElement).closest('[data-product-card-root]');
    const flySourceEl = root?.querySelector<HTMLElement>('[data-cart-fly-source]') ?? null;
    void addToCart({
      imageUrl: resolveProductCardImageSrc(product.image),
      flySourceEl,
    });
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <ProductCardList
        product={product}
        currency={currency}
        isInWishlist={isInWishlist}
        isInCompare={isInCompare}
        isAddingToCart={isAddingToCart}
        imageError={imageError}
        imageLoadPriority={imageLoadPriority}
        onImageError={() => setImageError(true)}
        onWishlistToggle={handleWishlistToggle}
        onCompareToggle={handleCompareToggle}
        onAddToCart={handleAddToCart}
      />
    );
  }

  // Grid view layout
  return (
    <ProductCardGrid
      product={product}
      currency={currency}
      isInWishlist={isInWishlist}
      isInCompare={isInCompare}
      isAddingToCart={isAddingToCart}
      imageError={imageError}
      isCompact={isCompact}
      shiftImageInFrame={shiftImageInFrame}
      squareImageFrame={squareImageFrame}
      smallerFooterPrice={smallerFooterPrice}
      specialOffersHomeCard={specialOffersHomeCard}
      homeProductGridCard={homeProductGridCard}
      imageLoadPriority={imageLoadPriority}
      onImageError={() => setImageError(true)}
      onWishlistToggle={handleWishlistToggle}
      onCompareToggle={handleCompareToggle}
      onAddToCart={handleAddToCart}
    />
  );
}

