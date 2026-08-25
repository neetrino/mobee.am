'use client';

import Image from 'next/image';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  categoryStripCardAspectClass,
  categoryStripHref,
  categoryStripInnerHeightClass,
  getCategoryStripTitleTranslateClass,
  getCategoryStripVisual,
  resolveCategoryStripImageForItem,
  resolveCategoryStripSlotKey,
  type CategoryStripSlotKey,
} from '../lib/categoryStrip';
import type { HomeStripCategoryItem } from '../lib/services/categories-home-strip-cached';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { TopCategoriesMobileIcon } from './TopCategoriesMobileIcon';
import { reorderHomeStripItemsForMobile } from '../lib/homeCategoryStripMobileOrder';
import { CategoryStripLink } from './CategoryStripLink';
import type { LanguageCode } from '../lib/language';
import { useHomeCategoryStrip } from './useHomeCategoryStrip';
import { HomeDesktopCarouselArrows } from './HomeDesktopCarouselArrows';

type TopCategoriesProps = {
  initialItems?: HomeStripCategoryItem[];
  initialLocale?: LanguageCode;
};

const montserrat = siteMontserrat;

const CATEGORY_STRIP_LOADING_SKELETON_COUNT = 3;
const CATEGORY_STRIP_SCROLL_ROW_CLASS =
  'flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide xl:gap-3';
/** Default Next/Image quality for strip tiles. */
const CATEGORY_STRIP_IMAGE_QUALITY = 75;
/** Watches use rotate + CSS scale — higher encode quality keeps edges sharper on desktop. */
const CATEGORY_STRIP_WATCHES_IMAGE_QUALITY = 92;
const CATEGORY_STRIP_SCROLL_EDGE_TOLERANCE_PX = 2;

function useCategoryStripScroll(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    setCanScrollPrev(element.scrollLeft > CATEGORY_STRIP_SCROLL_EDGE_TOLERANCE_PX);
    setCanScrollNext(
      element.scrollLeft + element.clientWidth <
        element.scrollWidth - CATEGORY_STRIP_SCROLL_EDGE_TOLERANCE_PX,
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
    if (
      !element ||
      !(firstItem instanceof HTMLElement) ||
      !(secondItem instanceof HTMLElement)
    ) {
      return;
    }
    const itemStep = secondItem.offsetLeft - firstItem.offsetLeft;
    element.scrollBy({ left: direction * itemStep, behavior: 'smooth' });
  }, []);

  return { scrollRef, canScrollPrev, canScrollNext, scrollByItem };
}

function CategoryStripDesktopImage({
  slotKey,
  imageSrc,
}: {
  slotKey: CategoryStripSlotKey;
  imageSrc: string;
}) {
  const visual = getCategoryStripVisual(slotKey);
  const innerH = categoryStripInnerHeightClass(visual);
  /** Extra CSS px so rotate/scale on watches still looks sharp on retina. */
  const imageSizes =
    slotKey === 'watches'
      ? '(max-width: 1279px) 180px, 220px'
      : '(max-width: 1279px) 17vw, 197px';

  return (
    <div
      className={`category-strip-tile-art absolute left-1/2 top-0 z-0 w-[197px] origin-top will-change-transform ${innerH}`}
    >
      <div className={`pointer-events-none z-[1] ${visual.imageWrapperClassName}`}>
        <div
          className={
            slotKey === 'watches'
              ? 'relative size-full -rotate-[5.85deg]'
              : slotKey === 'computers'
                ? 'relative size-full -scale-x-100'
                : 'relative size-full'
          }
        >
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes={imageSizes}
            quality={
              slotKey === 'watches'
                ? CATEGORY_STRIP_WATCHES_IMAGE_QUALITY
                : CATEGORY_STRIP_IMAGE_QUALITY
            }
            className={visual.imageClassName}
          />
        </div>
      </div>
    </div>
  );
}

function resolveStripSlotKey(
  category: HomeStripCategoryItem,
  index: number,
): CategoryStripSlotKey {
  return resolveCategoryStripSlotKey(category, index) ?? 'computers';
}

export function TopCategories({ initialItems, initialLocale }: TopCategoriesProps = {}) {
  const { t } = useTranslation();
  const { items, loadingHomeStrip: loading } = useHomeCategoryStrip({
    initialItems,
    initialLocale,
  });

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items],
  );

  const mobileSortedItems = useMemo(
    () => reorderHomeStripItemsForMobile(sortedItems),
    [sortedItems],
  );
  const {
    scrollRef,
    canScrollPrev,
    canScrollNext,
    scrollByItem,
  } = useCategoryStripScroll(sortedItems.length);

  if (loading) {
    return (
      <section className={`bg-gray-50 ${montserrat.className}`} aria-hidden>
        <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-4 pt-3 lg:pb-8 lg:pt-6 xl:pt-8`}>
          <div className={`${CATEGORY_STRIP_SCROLL_ROW_CLASS} lg:hidden`}>
            {Array.from({ length: CATEGORY_STRIP_LOADING_SKELETON_COUNT }, (_, index) => (
              <div key={index} className="flex shrink-0 flex-col items-center gap-2">
                <div className="size-[65px] animate-pulse rounded-lg bg-[#eceff2]" />
                <div className="h-9 w-20 animate-pulse rounded-full bg-[#eceff2]" />
              </div>
            ))}
          </div>
          <div className={`${CATEGORY_STRIP_SCROLL_ROW_CLASS} hidden lg:flex`}>
            {Array.from({ length: CATEGORY_STRIP_LOADING_SKELETON_COUNT }, (_, index) => (
              <div
                key={index}
                className="aspect-[197/201] w-[197px] shrink-0 animate-pulse rounded-[24px] bg-[#eceff2] xl:rounded-[30px]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (sortedItems.length === 0) {
    return null;
  }

  return (
      <section className={`bg-gray-50 ${montserrat.className}`} aria-label={t('common.navigation.categories')}>
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-6 pt-8 lg:pb-8 lg:pt-6 xl:pt-8`}>
        <div className={`${CATEGORY_STRIP_SCROLL_ROW_CLASS} lg:hidden`}>
          {mobileSortedItems.map((category) => {
            const slotKey = resolveStripSlotKey(category, category.position);
            const imageSrc = resolveCategoryStripImageForItem(category.media, slotKey);

            return (
              <CategoryStripLink
                key={category.id}
                href={categoryStripHref(category)}
                categorySlug={category.slug}
                className="flex shrink-0 flex-col items-center gap-2 transition-opacity active:opacity-90"
              >
                <TopCategoriesMobileIcon imageSrc={imageSrc} slotKey={slotKey} />
                <span className="shrink-0 rounded-full bg-[#f7f7f7] px-4 py-2 text-sm font-medium leading-normal text-[#303030]">
                  {category.title}
                </span>
              </CategoryStripLink>
            );
          })}
        </div>
        <div className="relative hidden lg:block">
          <div ref={scrollRef} className={`${CATEGORY_STRIP_SCROLL_ROW_CLASS} hidden lg:flex`}>
            {sortedItems.map((category, index) => {
              const slotKey = resolveStripSlotKey(category, index);
              const visual = getCategoryStripVisual(slotKey);
              const imageSrc = resolveCategoryStripImageForItem(category.media, slotKey);

              return (
                <CategoryStripLink
                  key={category.id}
                  href={categoryStripHref(category)}
                  categorySlug={category.slug}
                  className={`category-strip-card-cq group relative flex w-[197px] shrink-0 flex-col overflow-hidden rounded-[24px] bg-[#f0f2f4] transition-transform hover:opacity-[0.98] active:scale-[0.99] xl:rounded-[30px] ${categoryStripCardAspectClass(visual)}`}
                >
                  <div className="relative h-full w-full min-h-0 overflow-hidden">
                    <CategoryStripDesktopImage slotKey={slotKey} imageSrc={imageSrc} />
                  </div>
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex ${getCategoryStripTitleTranslateClass(category, slotKey)} justify-center px-1.5 pb-2.5 pt-1 text-center xl:px-2 xl:pb-[10px] xl:pt-0 ${
                      visual.tall ? 'xl:pb-3' : ''
                    }`}
                  >
                    <span className="line-clamp-2 max-w-full break-words text-[13px] font-bold leading-snug text-[#1c1c1c] [overflow-wrap:anywhere] xl:text-[16px] xl:leading-5">
                      {category.title}
                    </span>
                  </div>
                </CategoryStripLink>
              );
            })}
          </div>
          <HomeDesktopCarouselArrows
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
            onScrollPrev={() => scrollByItem(-1)}
            onScrollNext={() => scrollByItem(1)}
            prevAriaLabel={t('common.navigation.previousCategories')}
            nextAriaLabel={t('common.navigation.nextCategories')}
          />
        </div>
      </div>
    </section>
  );
}
