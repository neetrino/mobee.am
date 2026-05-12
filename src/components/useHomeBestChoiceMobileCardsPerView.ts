'use client';

import { useLayoutEffect, useState } from 'react';
import {
  HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_COMPACT,
  HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET,
  HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA,
} from './home-best-choice.constants';

function readTabletRangeCardsPerView(): number {
  if (typeof window === 'undefined') {
    return HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_COMPACT;
  }
  return window.matchMedia(HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA).matches
    ? HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET
    : HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_COMPACT;
}

/**
 * Cards visible in one “screenful” of the 2-row strip on narrow vs mid widths (4 vs 6); also sets {@link ProductCard} density.
 */
export function useHomeBestChoiceMobileCardsPerView(): number {
  const [cardsPerView, setCardsPerView] = useState(HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_COMPACT);

  useLayoutEffect(() => {
    setCardsPerView(readTabletRangeCardsPerView());
    const mq = window.matchMedia(HOME_BEST_CHOICE_MOBILE_TABLET_RANGE_MEDIA);
    const onChange = () => setCardsPerView(readTabletRangeCardsPerView());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return cardsPerView;
}
