'use client';

import { useState, useEffect } from 'react';

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
      } else if (width < 1024) {
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




