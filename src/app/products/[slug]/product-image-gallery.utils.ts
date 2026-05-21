const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 3;
const ZOOM_STEP = 0.2;
const SWIPE_THRESHOLD_PX = 40;

export function getNextImageIndex(currentIndex: number, totalImages: number): number {
  if (totalImages <= 0) {
    return 0;
  }

  return (currentIndex + 1) % totalImages;
}

export function getPreviousImageIndex(currentIndex: number, totalImages: number): number {
  if (totalImages <= 0) {
    return 0;
  }

  return (currentIndex - 1 + totalImages) % totalImages;
}

export function zoomIn(currentScale: number): number {
  return Math.min(MAX_ZOOM_SCALE, Number((currentScale + ZOOM_STEP).toFixed(2)));
}

export function zoomOut(currentScale: number): number {
  return Math.max(MIN_ZOOM_SCALE, Number((currentScale - ZOOM_STEP).toFixed(2)));
}

export function detectSwipeDirection(deltaX: number): "next" | "previous" | null {
  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
    return null;
  }

  return deltaX > 0 ? "previous" : "next";
}

/** Active slide index from horizontal scroll position (full-width snap slides). */
export function getCarouselIndexFromScrollLeft(
  scrollLeft: number,
  slideWidth: number,
  totalImages: number,
): number {
  if (totalImages <= 0 || slideWidth <= 0) {
    return 0;
  }

  const index = Math.round(scrollLeft / slideWidth);
  return Math.min(Math.max(index, 0), totalImages - 1);
}
