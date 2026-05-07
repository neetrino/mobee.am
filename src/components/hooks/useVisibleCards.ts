'use client';

import { useState, useEffect } from 'react';
import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '../../lib/layout-breakpoints.constants';

/**
 * Hook for determining number of visible cards based on screen size
 * @returns Number of visible cards
 */
export function useVisibleCards() {
  const [visibleCards, setVisibleCards] = useState(4);

  useEffect(() => {
    const updateVisibleCards = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCards(1); // mobile
      } else if (width < LAYOUT_DESKTOP_MIN_WIDTH_PX) {
        setVisibleCards(2); // tablet
      } else if (width < 1280) {
        setVisibleCards(3); // desktop
      } else {
        setVisibleCards(4); // large desktop
      }
    };

    updateVisibleCards();
    window.addEventListener('resize', updateVisibleCards);
    return () => window.removeEventListener('resize', updateVisibleCards);
  }, []);

  return visibleCards;
}




