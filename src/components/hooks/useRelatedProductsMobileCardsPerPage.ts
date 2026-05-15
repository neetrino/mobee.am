'use client';

import { useLayoutEffect, useState } from 'react';
import {
  RELATED_PRODUCTS_IPAD_PRO_BAND_MEDIA_QUERY,
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI,
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_PRO,
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE,
  RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY,
} from '../RelatedProducts/related-products-mobile.constants';

function readCardsPerPage(): number {
  if (typeof window === 'undefined') {
    return RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE;
  }
  if (window.matchMedia(RELATED_PRODUCTS_IPAD_PRO_BAND_MEDIA_QUERY).matches) {
    return RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_PRO;
  }
  if (window.matchMedia(RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY).matches) {
    return RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI;
  }
  return RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE;
}

/**
 * PDP “related products” carousel below `xl`: 2 / 3 / 4 cards per page by viewport band; `xl+` uses desktop strip.
 */
export function useRelatedProductsMobileCardsPerPage(): number {
  const [cardsPerPage, setCardsPerPage] = useState(RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE);

  useLayoutEffect(() => {
    const update = () => setCardsPerPage(readCardsPerPage());
    update();
    const mqPro = window.matchMedia(RELATED_PRODUCTS_IPAD_PRO_BAND_MEDIA_QUERY);
    const mqMini = window.matchMedia(RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY);
    mqPro.addEventListener('change', update);
    mqMini.addEventListener('change', update);
    return () => {
      mqPro.removeEventListener('change', update);
      mqMini.removeEventListener('change', update);
    };
  }, []);

  return cardsPerPage;
}
