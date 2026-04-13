'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';
import { useWishlist } from './hooks/useWishlist';
import { useCompare } from './hooks/useCompare';
import { useAddToCart } from './hooks/useAddToCart';
import { useCurrency } from './hooks/useCurrency';
import { ProductCardList } from './ProductCard/ProductCardList';
import { ProductCardGrid } from './ProductCard/ProductCardGrid';

interface Product {
  id: string;
  slug: string;
  title: string;
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
}

type ViewMode = 'list' | 'grid-2' | 'grid-3';

interface ProductCardProps {
  product: Product;
  viewMode?: ViewMode;
}

/**
 * Product card component with Compare, Wishlist and Cart icons
 * Displays product image, title, category, price and action buttons
 */
export function ProductCard({ product, viewMode = 'grid-3' }: ProductCardProps) {
  const isCompact = viewMode === 'grid-3';
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const currency = useCurrency();
  const { isInWishlist, toggleWishlist } = useWishlist(product.id);
  const { isInCompare, toggleCompare } = useCompare(product.id);
  const { isAddingToCart, addToCart } = useAddToCart({
    productId: product.id,
    productSlug: product.slug,
    inStock: product.inStock,
    defaultVariantId: product.defaultVariantId ?? undefined,
    price: product.price,
  });
  const [imageError, setImageError] = useState(false);

  // Handle wishlist toggle with auth check
  const handleWishlistToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      router.push(`/login?redirect=/products`);
      return;
    }
    
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
    addToCart();
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
      onImageError={() => setImageError(true)}
      onWishlistToggle={handleWishlistToggle}
      onCompareToggle={handleCompareToggle}
      onAddToCart={handleAddToCart}
    />
  );
}

