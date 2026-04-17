"use client";

import Link from "next/link";
import Image from "next/image";
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
}

/**
 * Centered product image for the grid card — portrait frame (vertical rectangle), object-contain.
 */
export function ProductCardImage({
  slug,
  image,
  title,
  imageError,
  onImageError,
  isCompact = false,
  shiftImageInFrame = false,
}: ProductCardImageProps) {
  const showPlaceholder = !image || imageError;
  const frameClass = isCompact
    ? "w-[min(160px,72%)] max-w-[85%]"
    : "w-[min(198px,78%)] max-w-[85%]";

  return (
    <div className={`relative aspect-[3/4] shrink-0 ${frameClass}`}>
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
            src={image}
            alt={title}
            fill
            className={
              shiftImageInFrame
                ? 'object-contain object-[60%_60%]'
                : 'object-contain'
            }
            sizes="(max-width: 768px) 78vw, (max-width: 1200px) 35vw, 198px"
            unoptimized
            onError={onImageError}
          />
        )}
      </Link>
    </div>
  );
}




