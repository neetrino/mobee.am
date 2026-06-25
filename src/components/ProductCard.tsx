'use client';

import { memo, useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useWishlist } from './hooks/useWishlist';
import { useCompare } from './hooks/useCompare';
import { resolveProductCardImageSrc } from '../lib/productCardDisplayImage';
import { warmProductCardNavigation } from '../lib/products/product-card-nav';
import { buildProductCardCachePayload } from '../lib/products/product-card-cache';
import { useAddToCart } from './hooks/useAddToCart';
import { useCurrency } from './hooks/useCurrency';
import { resolveCompareCategoryId } from '../lib/shop/compare-storage';
import { ProductCardList } from './ProductCard/ProductCardList';
import { ProductCardGrid } from './ProductCard/ProductCardGrid';
import {
  useProductCardListingInteractions,
  type ProductCardListingInteractions,
} from './ProductCardListingContext';

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
  shiftImageInFrame?: boolean;
  squareImageFrame?: boolean;
  smallerFooterPrice?: boolean;
  specialOffersHomeCard?: boolean;
  homeProductGridCard?: boolean;
  imageLoadPriority?: boolean;
  /** Listing cards (home/shop): primary button opens PDP instead of adding to cart. */
  addButtonNavigatesToProduct?: boolean;
}

interface ProductCardBodyProps extends ProductCardProps {
  currency: ReturnType<typeof useCurrency>;
  isInWishlist: boolean;
  isInCompare: boolean;
  isAddingToCart: boolean;
  onWishlistToggle: (event: MouseEvent) => void;
  onCompareToggle: (event: MouseEvent) => void;
  onAddToCart: (event: MouseEvent) => void;
}

function ProductCardBody({
  product,
  viewMode = 'grid-3',
  shiftImageInFrame = false,
  squareImageFrame = true,
  smallerFooterPrice = false,
  specialOffersHomeCard = false,
  homeProductGridCard = false,
  imageLoadPriority = false,
  addButtonNavigatesToProduct = false,
  currency,
  isInWishlist,
  isInCompare,
  isAddingToCart,
  onWishlistToggle,
  onCompareToggle,
  onAddToCart,
}: ProductCardBodyProps) {
  const [imageError, setImageError] = useState(false);
  const isCompact = viewMode === 'grid-3';

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
        onWishlistToggle={onWishlistToggle}
        onCompareToggle={onCompareToggle}
        onAddToCart={onAddToCart}
        addButtonNavigatesToProduct={addButtonNavigatesToProduct}
      />
    );
  }

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
      onWishlistToggle={onWishlistToggle}
      onCompareToggle={onCompareToggle}
      onAddToCart={onAddToCart}
      addButtonNavigatesToProduct={addButtonNavigatesToProduct}
    />
  );
}

function buildProductPagePath(slug: string): string {
  return `/products/${slug}`;
}

function useProductCardPrimaryActionHandler(
  product: Product,
  addButtonNavigatesToProduct: boolean,
) {
  const router = useRouter();
  const { isAddingToCart, addToCart } = useAddToCart({
    productId: product.id,
    productSlug: product.slug,
    inStock: product.inStock,
    defaultVariantId: product.defaultVariantId ?? undefined,
    price: product.price,
    title: product.title,
    image: product.image,
    compareAtPrice: product.compareAtPrice ?? product.originalPrice ?? null,
  });

  const handlePrimaryAction = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (addButtonNavigatesToProduct) {
        warmProductCardNavigation(buildProductCardCachePayload(product), router);
        router.push(buildProductPagePath(product.slug));
        return;
      }

      const root = (event.currentTarget as HTMLElement).closest('[data-product-card-root]');
      const flySourceEl = root?.querySelector<HTMLElement>('[data-cart-fly-source]') ?? null;
      void addToCart({
        imageUrl: resolveProductCardImageSrc(product.image),
        flySourceEl,
      });
    },
    [addButtonNavigatesToProduct, addToCart, product, router],
  );

  return {
    isAddingToCart: addButtonNavigatesToProduct ? false : isAddingToCart,
    handlePrimaryAction,
  };
}

function ProductCardFromListing({
  listing,
  addButtonNavigatesToProduct = false,
  ...props
}: ProductCardProps & { listing: ProductCardListingInteractions }) {
  const { isAddingToCart, handlePrimaryAction } = useProductCardPrimaryActionHandler(
    props.product,
    addButtonNavigatesToProduct,
  );

  return (
    <ProductCardBody
      {...props}
      currency={listing.currency}
      isInWishlist={listing.isInWishlist}
      isInCompare={listing.isInCompare}
      isAddingToCart={isAddingToCart}
      onWishlistToggle={listing.onWishlistToggle}
      onCompareToggle={listing.onCompareToggle}
      onAddToCart={handlePrimaryAction}
      addButtonNavigatesToProduct={addButtonNavigatesToProduct}
    />
  );
}

function ProductCardWithHooks({
  addButtonNavigatesToProduct = false,
  ...props
}: ProductCardProps) {
  const currency = useCurrency();
  const { isInWishlist, toggleWishlist } = useWishlist(props.product.id);
  const compareCategoryId = resolveCompareCategoryId(props.product);
  const { isInCompare, toggleCompare } = useCompare(props.product.id, compareCategoryId);
  const { isAddingToCart, handlePrimaryAction } = useProductCardPrimaryActionHandler(
    props.product,
    addButtonNavigatesToProduct,
  );

  const handleWishlistToggle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist();
  };

  const handleCompareToggle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCompare();
  };

  return (
    <ProductCardBody
      {...props}
      currency={currency}
      isInWishlist={isInWishlist}
      isInCompare={isInCompare}
      isAddingToCart={isAddingToCart}
      onWishlistToggle={handleWishlistToggle}
      onCompareToggle={handleCompareToggle}
      onAddToCart={handlePrimaryAction}
      addButtonNavigatesToProduct={addButtonNavigatesToProduct}
    />
  );
}

export const ProductCard = memo(function ProductCard(props: ProductCardProps) {
  const compareCategoryId = resolveCompareCategoryId(props.product);
  const listing = useProductCardListingInteractions(props.product.id, compareCategoryId);

  if (listing) {
    return <ProductCardFromListing {...props} listing={listing} />;
  }

  return <ProductCardWithHooks {...props} />;
});
