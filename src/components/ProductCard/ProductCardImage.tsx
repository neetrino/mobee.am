"use client";

import Link from "next/link";
import Image from "next/image";
import { resolveProductCardImageSrc } from "../../lib/productCardDisplayImage";
import {
  type ProductCardCachePayload,
} from "../../lib/products/product-card-cache";
import { buildProductCardNavHandlers } from "../../lib/products/product-card-nav";
import { buildProductPageHref } from "../../lib/products/product-page-href";
import { ProductImagePlaceholder } from "../ProductImagePlaceholder";
import { useRouter } from "next/navigation";

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
  /** Eager load for above-the-fold grid cells (LCP on shop / home). */
  imageLoadPriority?: boolean;
  listingCacheSource?: ProductCardCachePayload;
  linkColor?: string | null;
}

/**
 * Centered product image for the grid card — object-contain in a square frame (or portrait 3:4 when squareImageFrame is false).
 */
export function ProductCardImage({
  slug,
  image,
  title,
  imageError,
  onImageError,
  isCompact = false,
  shiftImageInFrame = false,
  squareImageFrame = true,
  imageLoadPriority = false,
  listingCacheSource,
  linkColor = null,
}: ProductCardImageProps) {
  const router = useRouter();
  const showPlaceholder = imageError;
  const imageSrc = resolveProductCardImageSrc(image);
  const warmHandlers = listingCacheSource
    ? buildProductCardNavHandlers(listingCacheSource, router, linkColor)
    : undefined;
  /** max-lg: frame 90% width vs desktop (171 / 212) so title clears the image on small screens. */
  const frameClass = isCompact
    ? "w-[171px] max-w-[84%] max-lg:w-[153.9px]"
    : "w-[212px] max-w-[84%] max-lg:w-[190.8px]";
  const aspectClass = squareImageFrame ? "aspect-square" : "aspect-[3/4]";

  return (
    <div className={`relative ${aspectClass} shrink-0 ${frameClass}`} data-cart-fly-source>
      <Link
        href={buildProductPageHref(slug, { color: linkColor })}
        className="absolute inset-0 block"
        aria-label={title}
        prefetch
        {...(warmHandlers ?? {})}
      >
        {showPlaceholder ? (
          <ProductImagePlaceholder
            className="h-full w-full"
            aria-label={title ? `No image for ${title}` : "No image"}
          />
        ) : (
          <Image
            src={imageSrc}
            alt={title}
            fill
            className={
              shiftImageInFrame
                ? 'object-contain object-[60%_60%]'
                : 'object-contain'
            }
            sizes="(max-width: 768px) 78vw, (max-width: 1200px) 35vw, 212px"
            priority={imageLoadPriority}
            onError={onImageError}
          />
        )}
      </Link>
    </div>
  );
}




