'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing category navigation scroll state
 */
export function useCategoryScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      console.warn('[CategoryNavigation] Container not found for updateScrollButtons');
      return;
    }

    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    const canLeft = scrollLeft > 8;
    const canRight = scrollLeft + clientWidth < scrollWidth - 8;

    console.info('[CategoryNavigation] Update scroll buttons:', {
      scrollLeft,
      scrollWidth,
      clientWidth,
      canLeft,
      canRight
    });

    setCanScrollLeft(canLeft);
    setCanScrollRight(canRight);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      // Небольшая задержка для корректного расчета размеров после ресайза
      setTimeout(() => updateScrollButtons(), 100);
    };
    
    const handleScroll = () => {
      updateScrollButtons();
    };
    
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    // Инициализация с небольшой задержкой для корректного расчета размеров
    setTimeout(() => {
      updateScrollButtons();
    }, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateScrollButtons]);

  const scrollByAmount = (amount: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      console.warn('[CategoryNavigation] Container not found for scrolling');
      return;
    }
    
    const scrollLeftBefore = container.scrollLeft;
    console.info('[CategoryNavigation] Scrolling:', { 
      direction: amount > 0 ? 'right' : 'left', 
      amount, 
      scrollLeftBefore,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth
    });
    
    container.scrollBy({ left: amount, behavior: 'smooth' });
    
    // Обновляем состояние после небольшой задержки для плавной прокрутки
    setTimeout(() => {
      updateScrollButtons();
    }, 100);
  };

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    scrollByAmount,
    updateScrollButtons,
  };
}




