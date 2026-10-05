"use client";

import { ProductImagePlaceholder } from "../../../../components/ProductImagePlaceholder";

interface ProductSharedImagesStripProps {
  images: string[];
  /** Gallery index of `images[0]`. */
  startIndex: number;
  currentImageIndex: number;
  failedIndices: Set<number>;
  onImageIndexChange: (index: number) => void;
  onImageError: (index: number) => void;
}

/**
 * Small thumbnails of shared product images rendered under the main PDP image.
 */
export function ProductSharedImagesStrip({
  images,
  startIndex,
  currentImageIndex,
  failedIndices,
  onImageIndexChange,
  onImageError,
}: ProductSharedImagesStripProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex w-full flex-wrap justify-center gap-3">
      {images.map((image, offset) => {
        const index = startIndex + offset;
        const isActive = index === currentImageIndex;
        return (
          <button
            type="button"
            key={image}
            onClick={() => onImageIndexChange(index)}
            className={`shrink-0 border-b-2 pb-1.5 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-admin-500 ${
              isActive ? "border-gray-900" : "border-transparent hover:border-gray-300"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white p-1 product-2col:h-14 product-2col:w-14">
              {failedIndices.has(index) ? (
                <ProductImagePlaceholder className="h-full w-full" aria-label="" />
              ) : (
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={() => onImageError(index)}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
