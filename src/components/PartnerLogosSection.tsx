'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import {
  PARTNER_LOGO_CARD_CLASS,
  PARTNER_LOGO_IMAGE_CLASS,
  PARTNER_LOGOS,
  PARTNER_LOGOS_NAV_BUTTON_CLASS,
  PARTNER_LOGOS_SCROLL_EDGE_TOLERANCE_PX,
  PARTNER_LOGOS_TRACK_CLASS,
  partnerLogoShopHref,
  type PartnerLogoItem,
} from './partner-logos.constants';

const montserrat = siteMontserrat;

function usePartnerLogosScroll(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const { scrollLeft, clientWidth, scrollWidth } = element;
    setCanScrollPrev(scrollLeft > PARTNER_LOGOS_SCROLL_EDGE_TOLERANCE_PX);
    setCanScrollNext(
      scrollLeft + clientWidth < scrollWidth - PARTNER_LOGOS_SCROLL_EDGE_TOLERANCE_PX,
    );
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    updateScrollState();
    element.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);
    return () => {
      element.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [itemCount, updateScrollState]);

  const scrollByItem = useCallback((direction: -1 | 1) => {
    const element = scrollRef.current;
    const firstItem = element?.children.item(0);
    const secondItem = element?.children.item(1);
    if (!element || !(firstItem instanceof HTMLElement)) {
      return;
    }
    const step =
      secondItem instanceof HTMLElement
        ? secondItem.offsetLeft - firstItem.offsetLeft
        : firstItem.offsetWidth;
    element.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);

  return { scrollRef, canScrollPrev, canScrollNext, scrollByItem };
}

function PartnerLogoCard({ item, alt }: { item: PartnerLogoItem; alt: string }) {
  return (
    <Link href={partnerLogoShopHref(item.id)} className={PARTNER_LOGO_CARD_CLASS}>
      <Image
        src={item.src}
        alt={alt}
        width={item.width}
        height={item.height}
        className={item.imageClassName ?? PARTNER_LOGO_IMAGE_CLASS}
        unoptimized
      />
    </Link>
  );
}

function PartnerLogosNav({
  canScrollPrev,
  canScrollNext,
  onScrollPrev,
  onScrollNext,
  prevAriaLabel,
  nextAriaLabel,
}: {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
}) {
  return (
    <div className="hidden justify-end gap-2 lg:flex">
      <button
        type="button"
        onClick={onScrollPrev}
        disabled={!canScrollPrev}
        aria-label={prevAriaLabel}
        className={PARTNER_LOGOS_NAV_BUTTON_CLASS}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onScrollNext}
        disabled={!canScrollNext}
        aria-label={nextAriaLabel}
        className={PARTNER_LOGOS_NAV_BUTTON_CLASS}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Partner brand strip — equal cards in one scrolling row (redstore.am manufacturers).
 */
export function PartnerLogosSection() {
  const { t } = useTranslation();
  const { scrollRef, canScrollPrev, canScrollNext, scrollByItem } =
    usePartnerLogosScroll(PARTNER_LOGOS.length);

  return (
    <section
      className="mt-8 bg-white pb-6 pt-6 lg:mt-20 lg:pb-10 lg:pt-10"
      aria-label={t('home.partner_logos.heading')}
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} flex flex-col gap-5 lg:gap-10`}>
        <h2
          className={`${montserrat.className} text-xl font-bold leading-snug text-[#303030] lg:text-[34px] lg:leading-[2.5rem] lg:text-[#111827]`}
        >
          {t('home.partner_logos.heading')}
        </h2>
        <div
          ref={scrollRef}
          className={PARTNER_LOGOS_TRACK_CLASS}
          aria-roledescription="carousel"
          aria-label={t('home.partner_logos.heading')}
        >
          {PARTNER_LOGOS.map((item) => (
            <PartnerLogoCard
              key={item.id}
              item={item}
              alt={t(`home.partner_logos.${item.id}`)}
            />
          ))}
        </div>
        <PartnerLogosNav
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
          onScrollPrev={() => scrollByItem(-1)}
          onScrollNext={() => scrollByItem(1)}
          prevAriaLabel={t('home.partner_logos.scrollPrevious')}
          nextAriaLabel={t('home.partner_logos.scrollNext')}
        />
      </div>
    </section>
  );
}
