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
            <span className="group/shared flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-white bg-gradient-to-br from-white to-gray-100 p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] product-2col:h-14 product-2col:w-14">
              {failedIndices.has(index) ? (
                <ProductImagePlaceholder className="h-full w-full" aria-label="" />
              ) : (
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-contain transition-transform duration-200 group-hover/shared:scale-110"
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
