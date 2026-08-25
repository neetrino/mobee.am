import type { MouseEvent } from 'react';
import type { CurrencyCode } from '../../lib/currency';
import type { ProductLabel } from '../ProductLabels';
import type { ProductWarrantyYears } from '../../lib/constants/product-warranty';

export interface ProductCardGridProps {
  product: {
    id: string;
    slug: string;
    title: string;
    primaryCategoryId?: string | null;
    categories?: Array<{ id: string; slug?: string; title?: string }>;
    price: number | null;
    hasPrice?: boolean;
    image: string | null;
    inStock: boolean;
    brand: { id: string; name: string } | null;
    labels?: ProductLabel[];
    compareAtPrice?: number | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    warrantyYears?: ProductWarrantyYears | null;
    colors?: Array<{
      value: string;
      linkValue?: string;
      imageUrl?: string | null;
      colors?: string[] | null;
    }>;
  };
  currency: CurrencyCode;
  isInWishlist: boolean;
  isInCompare: boolean;
  isAddingToCart: boolean;
  imageError: boolean;
  isCompact?: boolean;
  shiftImageInFrame?: boolean;
  squareImageFrame?: boolean;
  /** Smaller footer price (home “best choice”; ~23% under default grid-2). */
  smallerFooterPrice?: boolean;
  /** Home special-offers cards — desktop add-to-cart pill matches design grid. */
  specialOffersHomeCard?: boolean;
  /** Home curated grids — mobile Figma card (grouped background, compact footer). */
  homeProductGridCard?: boolean;
  /** Eager image for first viewport rows (LCP). */
  imageLoadPriority?: boolean;
  onImageError: () => void;
  onWishlistToggle: (e: MouseEvent) => void;
  onCompareToggle: (e: MouseEvent) => void;
  onAddToCart: (e: MouseEvent) => void;
  addButtonNavigatesToProduct?: boolean;
  linkColor?: string | null;
  selectedCardLinkColor?: string | null;
  colorsInteractive?: boolean;
  onCardColorSelect?: (color: {
    value: string;
    linkValue?: string;
    imageUrl?: string | null;
    colors?: string[] | null;
  }) => void;
  /** Stack installment CTA label on two lines. */
  stackInstallmentLabel?: boolean;
}
