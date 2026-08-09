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
 * Cards per single-row carousel page below `lg`: 2 on phones, 3 on tablet / iPad mini.
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
