"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";
import { ProductLabels } from "../../../components/ProductLabels";
import { ProductImagePlaceholder } from "../../../components/ProductImagePlaceholder";
import { t } from "../../../lib/i18n";
import type { LanguageCode } from "../../../lib/language";
import type { Product } from "./types";
import {
  detectSwipeDirection,
  getNextImageIndex,
  getPreviousImageIndex,
  zoomIn,
  zoomOut,
} from "./product-image-gallery.utils";

interface ProductImageGalleryProps {
  images: string[];
  product: Product;
  discountPercent: number | null;
  language: LanguageCode;
  currentImageIndex: number;
  onImageIndexChange: (index: number) => void;
  thumbnailStartIndex: number;
  onThumbnailStartIndexChange: (index: number) => void;
}

const THUMBNAILS_PER_VIEW = 3;

export function ProductImageGallery({
  images,
  product,
  discountPercent,
  language,
  currentImageIndex,
  onImageIndexChange,
  thumbnailStartIndex,
  onThumbnailStartIndexChange,
}: ProductImageGalleryProps) {
  const [showZoom, setShowZoom] = useState(false);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [zoomScale, setZoomScale] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const markFailed = (index: number) => {
    setFailedIndices((prev) => new Set(prev).add(index));
  };

  const mainImageFailed = failedIndices.has(currentImageIndex);
  const currentSrc = images[currentImageIndex];
  const hasMultipleImages = images.length > 1;

  const goToPreviousImage = () => {
    onImageIndexChange(getPreviousImageIndex(currentImageIndex, images.length));
  };

  const goToNextImage = () => {
    onImageIndexChange(getNextImageIndex(currentImageIndex, images.length));
  };

  // Auto-scroll thumbnails to show selected image
  useEffect(() => {
    if (images.length > THUMBNAILS_PER_VIEW) {
      if (currentImageIndex < thumbnailStartIndex) {
        // Selected image is above visible range - scroll up
        onThumbnailStartIndexChange(currentImageIndex);
      } else if (currentImageIndex >= thumbnailStartIndex + THUMBNAILS_PER_VIEW) {
        // Selected image is below visible range - scroll down
        onThumbnailStartIndexChange(currentImageIndex - THUMBNAILS_PER_VIEW + 1);
      }
    }
  }, [currentImageIndex, images.length, thumbnailStartIndex, onThumbnailStartIndexChange]);

  // Show only 3 thumbnails at a time, scrollable with navigation arrows
  const visibleThumbnails = images.slice(thumbnailStartIndex, thumbnailStartIndex + THUMBNAILS_PER_VIEW);

  useEffect(() => {
    if (!showZoom) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowZoom(false);
      }

      if (!hasMultipleImages) {
        return;
      }

      if (event.key === "ArrowLeft") {
        goToPreviousImage();
      }

      if (event.key === "ArrowRight") {
        goToNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showZoom, hasMultipleImages, currentImageIndex, images.length]);

  return (
    <>
      <div className="flex gap-5 items-start">
        {/* Left Column - Thumbnails (Vertical) - Show 3 at a time, scrollable */}
        <div className="group/thumbs flex w-24 shrink-0 flex-col gap-3">
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            {visibleThumbnails.map((image, index) => {
              const actualIndex = thumbnailStartIndex + index;
              const isActive = actualIndex === currentImageIndex;
              return (
                <button
                  type="button"
                  key={actualIndex}
                  onClick={() => onImageIndexChange(actualIndex)}
                  className={`relative box-border aspect-[3/4] w-full flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-500 ${
                    isActive
                      ? "border-admin-500"
                      : "border-gray-200 hover:border-admin-300"
                  }`}
                >
                  {failedIndices.has(actualIndex) ? (
                    <ProductImagePlaceholder className="w-full h-full" aria-label="" />
                  ) : (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => markFailed(actualIndex)}
                    />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Navigation Arrows - Scroll thumbnails */}
          {images.length > THUMBNAILS_PER_VIEW && (
            <div className="flex flex-row justify-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover/thumbs:opacity-100">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Scroll thumbnails up
                  const newStart = Math.max(0, thumbnailStartIndex - 1);
                  onThumbnailStartIndexChange(newStart);
                  // Also update current image if needed
                  if (currentImageIndex > newStart + THUMBNAILS_PER_VIEW - 1) {
                    onImageIndexChange(newStart + THUMBNAILS_PER_VIEW - 1);
                  } else if (currentImageIndex < newStart) {
                    onImageIndexChange(newStart);
                  }
                }}
                disabled={thumbnailStartIndex <= 0}
                className="pointer-events-none flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-gray-300 bg-gray-100 text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-200 hover:shadow-[0_1px_3px_rgba(0,0,0,0.1)] disabled:cursor-default disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:bg-gray-100 disabled:hover:shadow-none group-hover/thumbs:pointer-events-auto"
                aria-label={t(language, 'common.ariaLabels.previousThumbnail')}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M5 15l7-7 7 7" 
                  />
                </svg>
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Scroll thumbnails down
                  const newStart = Math.min(images.length - THUMBNAILS_PER_VIEW, thumbnailStartIndex + 1);
                  onThumbnailStartIndexChange(newStart);
                  // Also update current image if needed
                  if (currentImageIndex < newStart) {
                    onImageIndexChange(newStart);
                  } else if (currentImageIndex > newStart + THUMBNAILS_PER_VIEW - 1) {
                    onImageIndexChange(newStart + THUMBNAILS_PER_VIEW - 1);
                  }
                }}
                disabled={thumbnailStartIndex >= images.length - THUMBNAILS_PER_VIEW}
                className="pointer-events-none flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-gray-300 bg-gray-100 text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-200 hover:shadow-[0_1px_3px_rgba(0,0,0,0.1)] disabled:cursor-default disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:bg-gray-100 disabled:hover:shadow-none group-hover/thumbs:pointer-events-auto"
                aria-label={t(language, 'common.ariaLabels.nextThumbnail')}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M19 9l-7 7-7-7" 
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Right Column - Main Image */}
        <div className="flex-1">
          <div
            className="group relative aspect-square overflow-hidden rounded-lg bg-white shadow-sm"
            data-pdp-cart-fly-source
          >
          {images.length > 0 && !mainImageFailed ? (
            <img
              src={currentSrc}
              alt={product.title}
              className="h-full w-full object-cover"
              onError={() => markFailed(currentImageIndex)}
            />
          ) : (
            <ProductImagePlaceholder
              className="w-full h-full"
              aria-label={t(language, "common.messages.noImage")}
            />
          )}
          
          {/* Discount Badge on Image - Blue circle in top-right */}
          {discountPercent && (
            <div className="absolute top-4 right-4 w-14 h-14 bg-admin-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-10 shadow-[0_2px_8px_rgba(45,178,255,0.35)]">
              -{discountPercent}%
            </div>
          )}

          {product.labels && <ProductLabels labels={product.labels} />}

          {hasMultipleImages && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToPreviousImage();
                }}
                className="pointer-events-none flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-white/85 text-gray-800 shadow-md backdrop-blur-sm transition-colors hover:bg-white group-hover:pointer-events-auto"
                aria-label={t(language, 'common.ariaLabels.previousImage')}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToNextImage();
                }}
                className="pointer-events-none flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-white/85 text-gray-800 shadow-md backdrop-blur-sm transition-colors hover:bg-white group-hover:pointer-events-auto"
                aria-label={t(language, 'common.ariaLabels.nextImage')}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          )}
          
          {/* Control Buttons - Bottom left */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-3 z-10">
            {/* Fullscreen Button */}
            <button 
              onClick={() => {
                setZoomScale(1);
                setShowZoom(true);
              }}
              className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-white/90 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              aria-label={t(language, 'common.ariaLabels.fullscreenImage')}
            >
              <Maximize2 className="w-5 h-5 text-gray-800" />
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {showZoom && images.length > 0 && !failedIndices.has(currentImageIndex) && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setShowZoom(false)}>
          <div
            className="relative w-full h-full flex items-center justify-center"
            onTouchStart={(event) => {
              setTouchStartX(event.changedTouches[0]?.clientX ?? null);
            }}
            onTouchEnd={(event) => {
              if (touchStartX === null || !hasMultipleImages) {
                return;
              }

              const endX = event.changedTouches[0]?.clientX ?? touchStartX;
              const swipeDirection = detectSwipeDirection(endX - touchStartX);

              if (swipeDirection === "next") {
                goToNextImage();
              } else if (swipeDirection === "previous") {
                goToPreviousImage();
              }

              setTouchStartX(null);
            }}
          >
            <img
              src={currentSrc}
              alt=""
              className="max-w-full max-h-full object-contain transition-transform duration-150"
              style={{ transform: `scale(${zoomScale})` }}
              onWheel={(event) => {
                event.preventDefault();
                setZoomScale((prev) => (event.deltaY < 0 ? zoomIn(prev) : zoomOut(prev)));
              }}
            />

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
                  aria-label={t(language, "common.ariaLabels.previousImage")}
                  onClick={(event) => {
                    event.stopPropagation();
                    goToPreviousImage();
                  }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
                  aria-label={t(language, "common.ariaLabels.nextImage")}
                  onClick={(event) => {
                    event.stopPropagation();
                    goToNextImage();
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/45 rounded-full px-3 py-2">
              <button
                type="button"
                aria-label="Zoom out"
                className="text-white p-1 rounded hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  setZoomScale((prev) => zoomOut(prev));
                }}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white text-xs min-w-12 text-center">{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                className="text-white p-1 rounded hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  setZoomScale((prev) => zoomIn(prev));
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button 
            className="absolute top-4 right-4 text-white"
            aria-label={t(language, 'common.buttons.close')}
            onClick={(e) => {
              e.stopPropagation();
              setZoomScale(1);
              setShowZoom(false);
            }}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </>
  );
}
