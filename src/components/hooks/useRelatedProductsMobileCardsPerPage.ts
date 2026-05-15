'use client';

import { useLayoutEffect, useState } from 'react';
import {
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI,
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE,
  RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY,
} from '../RelatedProducts/related-products-mobile.constants';

function readCardsPerPage(): number {
  if (typeof window === 'undefined') {
    return RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE;
  }
  return window.matchMedia(RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY).matches
    ? RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI
    : RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE;
}

/**
 * PDP “related products” carousel below `lg`: 2 cards per page on phones, 3 on iPad mini / narrow tablet band.
 */
export function useRelatedProductsMobileCardsPerPage(): number {
  const [cardsPerPage, setCardsPerPage] = useState(RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_PHONE);

  useLayoutEffect(() => {
    setCardsPerPage(readCardsPerPage());
    const mq = window.matchMedia(RELATED_PRODUCTS_MOBILE_IPAD_MINI_BAND_MEDIA_QUERY);
    const onChange = () => setCardsPerPage(readCardsPerPage());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return cardsPerPage;
}
