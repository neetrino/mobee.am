'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';

function initialMobileCarouselState(
  productsPerPage: number,
  mobileCardsPerView: number,
): MobileCarouselViewState {
  return {
    pageIndex: 0,
    pageCount: Math.max(1, Math.ceil(productsPerPage / mobileCardsPerView)),
  };
}

export function useHomeProductSectionsCarousels(
  featuredProductsPerPage: number,
  specialOffersProductsPerPage: number,
  mobileCardsPerView: number,
) {
  const [featuredCarousel, setFeaturedCarousel] = useState(() =>
    initialMobileCarouselState(featuredProductsPerPage, mobileCardsPerView),
  );
  const [specialOffersCarousel, setSpecialOffersCarousel] = useState(() =>
    initialMobileCarouselState(specialOffersProductsPerPage, mobileCardsPerView),
  );

  useEffect(() => {
    setFeaturedCarousel(initialMobileCarouselState(featuredProductsPerPage, mobileCardsPerView));
    setSpecialOffersCarousel(
      initialMobileCarouselState(specialOffersProductsPerPage, mobileCardsPerView),
    );
  }, [featuredProductsPerPage, specialOffersProductsPerPage, mobileCardsPerView]);

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
