'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';

function initialMobileCarouselState(
  productsPerPage: number,
  cardsPerViewportEstimate: number,
): MobileCarouselViewState {
  return {
    pageIndex: 0,
    pageCount: Math.max(1, Math.ceil(productsPerPage / cardsPerViewportEstimate)),
  };
}

/** Special-offers strip is one row tall — fewer cards per viewport than the two-row featured strip (estimate for dots until scroll sync). */
function specialOffersCarouselCardsPerViewportEstimate(mobileCardsPerView: number): number {
  return Math.max(1, mobileCardsPerView / 2);
}

export function useHomeProductSectionsCarousels(
  featuredProductsPerPage: number,
  specialOffersProductsPerPage: number,
  mobileCardsPerView: number,
) {
  const specialOffersCardsEstimate = specialOffersCarouselCardsPerViewportEstimate(mobileCardsPerView);

  const [featuredCarousel, setFeaturedCarousel] = useState(() =>
    initialMobileCarouselState(featuredProductsPerPage, mobileCardsPerView),
  );
  const [specialOffersCarousel, setSpecialOffersCarousel] = useState(() =>
    initialMobileCarouselState(specialOffersProductsPerPage, specialOffersCardsEstimate),
  );

  useEffect(() => {
    setFeaturedCarousel(initialMobileCarouselState(featuredProductsPerPage, mobileCardsPerView));
    setSpecialOffersCarousel(
      initialMobileCarouselState(specialOffersProductsPerPage, specialOffersCardsEstimate),
    );
  }, [
    featuredProductsPerPage,
    specialOffersProductsPerPage,
    mobileCardsPerView,
    specialOffersCardsEstimate,
  ]);

  const onFeaturedCarouselViewChange = useCallback((state: MobileCarouselViewState) => {
    setFeaturedCarousel((prev) =>
      prev.pageIndex === state.pageIndex && prev.pageCount === state.pageCount ? prev : state,
    );
  }, []);

  const onSpecialOffersCarouselViewChange = useCallback((state: MobileCarouselViewState) => {
    setSpecialOffersCarousel((prev) =>
      prev.pageIndex === state.pageIndex && prev.pageCount === state.pageCount ? prev : state,
    );
  }, []);

  return {
    featuredCarousel,
    specialOffersCarousel,
    onFeaturedCarouselViewChange,
    onSpecialOffersCarouselViewChange,
  };
}
