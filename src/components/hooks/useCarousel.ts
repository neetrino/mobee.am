'use client';

import { useState, useEffect, useRef, type MouseEvent, type TouchEvent } from 'react';

interface UseCarouselProps {
  itemCount: number;
  visibleItems: number;
  autoRotateInterval?: number;
}

/**
 * Hook for managing carousel state and interactions
 */
export function useCarousel({ itemCount, visibleItems, autoRotateInterval = 5000 }: UseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const maxIndex = Math.max(0, itemCount - visibleItems);

  // Auto-rotate carousel
  useEffect(() => {
    if (itemCount <= visibleItems || isDragging) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        return prevIndex >= maxIndex ? 0 : prevIndex + 1;
      });
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [itemCount, visibleItems, isDragging, maxIndex, autoRotateInterval]);

  // Adjust currentIndex when visibleItems changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [visibleItems, itemCount, maxIndex, currentIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => {
      return prevIndex === 0 ? maxIndex : prevIndex - 1;
    });
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => {
      return prevIndex >= maxIndex ? 0 : prevIndex + 1;
    });
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(maxIndex, index)));
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return;
    setHasMoved(false);
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(currentIndex);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.pageX - carouselRef.current.offsetLeft;
    const deltaX = Math.abs(x - startX);
    
    // Only consider it dragging if mouse moved more than 5px
    if (deltaX > 5) {
      setHasMoved(true);
      e.preventDefault();
      const walk = (x - startX) * 2; // Scroll speed multiplier
      const cardWidth = 100 / visibleItems;
      const newIndex = Math.round((scrollLeft - walk / (carouselRef.current.offsetWidth / 100)) / cardWidth);
      const clampedIndex = Math.max(0, Math.min(maxIndex, newIndex));
      setCurrentIndex(clampedIndex);
    }
  };

  const handleMouseUp = () => {
    const wasDragging = isDragging;
    const didMove = hasMoved;
    setIsDragging(false);
    // Reset hasMoved after a short delay to allow click events to process
    if (wasDragging && didMove) {
      setTimeout(() => setHasMoved(false), 150);
    } else {
      setHasMoved(false);
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return;
    setHasMoved(false);
    setIsDragging(true);
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
    setScrollLeft(currentIndex);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const deltaX = Math.abs(x - startX);
    
    // Only consider it dragging if touch moved more than 5px
    if (deltaX > 5) {
      setHasMoved(true);
      const walk = (x - startX) * 2;
      const cardWidth = 100 / visibleItems;
      const newIndex = Math.round((scrollLeft - walk / (carouselRef.current.offsetWidth / 100)) / cardWidth);
      const clampedIndex = Math.max(0, Math.min(maxIndex, newIndex));
      setCurrentIndex(clampedIndex);
    }
  };

  const handleTouchEnd = () => {
    const wasDragging = isDragging;
    const didMove = hasMoved;
    setIsDragging(false);
    if (wasDragging && didMove) {
      setTimeout(() => setHasMoved(false), 150);
    } else {
      setHasMoved(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex + delta;
      return Math.max(0, Math.min(maxIndex, newIndex));
    });
  };

  return {
    currentIndex,
    isDragging,
    hasMoved,
    carouselRef,
    goToPrevious,
    goToNext,
    goToIndex,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  };
}




