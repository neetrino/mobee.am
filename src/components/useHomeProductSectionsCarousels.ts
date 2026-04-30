'use client';

import { useCallback, useState } from 'react';
import { HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW } from './home-best-choice.constants';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';

function initialMobileCarouselState(productsPerPage: number): MobileCarouselViewState {
  return {
    pageIndex: 0,
    pageCount: Math.max(1, Math.ceil(productsPerPage / HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW)),
  };
}

export function useHomeProductSectionsCarousels(
  featuredProductsPerPage: number,
  specialOffersProductsPerPage: number,
) {
  const [featuredCarousel, setFeaturedCarousel] = useState(() =>
    initialMobileCarouselState(featuredProductsPerPage),
  );
  const [specialOffersCarousel, setSpecialOffersCarousel] = useState(() =>
    initialMobileCarouselState(specialOffersProductsPerPage),
  );

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
