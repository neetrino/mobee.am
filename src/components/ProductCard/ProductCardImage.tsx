"use client";

import Link from "next/link";
import Image from "next/image";
import { PRODUCT_CARD_DISPLAY_IMAGE_SRC } from "../../lib/productCardDisplayImage";
import { ProductImagePlaceholder } from "../ProductImagePlaceholder";

interface ProductCardImageProps {
  slug: string;
  image: string | null;
  title: string;
  imageError: boolean;
  onImageError: () => void;
  isCompact?: boolean;
  /** Shift focal point ~10% from center (home “best choice” cards). */
  shiftImageInFrame?: boolean;
  /** Square image frame; false uses portrait 3:4. */
  squareImageFrame?: boolean;
}

/**
 * Centered product image for the grid card — object-contain in a square frame (or portrait 3:4 when squareImageFrame is false).
 */
export function ProductCardImage({
  slug,
  image: _productImage,
  title,
  imageError,
  onImageError,
  isCompact = false,
  shiftImageInFrame = false,
  squareImageFrame = true,
}: ProductCardImageProps) {
  const showPlaceholder = imageError;
  const frameClass = isCompact
    ? "w-[171px] max-w-[84%]"
    : "w-[212px] max-w-[84%]";
  const aspectClass = squareImageFrame ? "aspect-square" : "aspect-[3/4]";

  return (
    <div className={`relative ${aspectClass} shrink-0 ${frameClass}`}>
      <Link
        href={`/products/${slug}`}
        className="absolute inset-0 block"
        aria-label={title}
      >
        {showPlaceholder ? (
          <ProductImagePlaceholder
            className="h-full w-full"
            aria-label={title ? `No image for ${title}` : "No image"}
          />
        ) : (
          <Image
            src={PRODUCT_CARD_DISPLAY_IMAGE_SRC}
            alt={title}
            fill
            className={
              shiftImageInFrame
                ? 'object-contain object-[60%_60%]'
                : 'object-contain'
            }
            sizes="(max-width: 768px) 78vw, (max-width: 1200px) 35vw, 212px"
            unoptimized
            onError={onImageError}
          />
        )}
      </Link>
    </div>
  );
}




