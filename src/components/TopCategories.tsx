'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useMemo } from 'react';
import type { CategoryTreeNode } from '../lib/category-nav';
import {
  CATEGORY_STRIP_GRID_COLS,
  CATEGORY_STRIP_SLOT_ORDER,
  categoryStripCardAspectClass,
  categoryStripHref,
  categoryStripHrefForSlot,
  categoryStripInnerHeightClass,
  getCategoryStripVisual,
  HOME_CATEGORY_STRIP_LIMIT,
  mapHomeStripItemsByPosition,
  resolveCategoryStripImageSrc,
  type CategoryStripSlotKey,
} from '../lib/categoryStrip';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { TopCategoriesMobileIcon } from './TopCategoriesMobileIcon';
import { useHomeCategoryStrip } from './useHomeCategoryStrip';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['700'],
  display: 'swap',
});

const SLOT_LABEL_KEYS: Record<CategoryStripSlotKey, `common.mainHeader.${string}`> = {
  computers: 'common.mainHeader.computersLink',
  phones: 'common.mainHeader.phonesLink',
  tablets: 'common.mainHeader.tabletsLink',
  watches: 'common.mainHeader.watchesLink',
  headphones: 'common.mainHeader.headphonesLink',
  accessories: 'common.mainHeader.accessoriesLink',
};

function CategoryStripDesktopImage({ slotKey }: { slotKey: CategoryStripSlotKey }) {
  const visual = getCategoryStripVisual(slotKey);
  const imageSrc = resolveCategoryStripImageSrc(slotKey);
  const innerH = categoryStripInnerHeightClass(visual);

  return (
    <div
      className={`category-strip-tile-art absolute left-1/2 top-0 z-0 w-[197px] origin-top will-change-transform ${innerH}`}
    >
      <div className={`pointer-events-none z-[1] ${visual.imageWrapperClassName}`}>
        {slotKey === 'watches' ? (
          <div className="flex size-full items-center justify-center">
            <div className="flex-none -rotate-[5.85deg]">
              <div className="relative size-[140px]">
                <Image
                  src={imageSrc}
                  alt=""
                  width={visual.imageWidth}
                  height={visual.imageHeight}
                  className={`size-full max-w-none ${visual.imageClassName}`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={
              slotKey === 'computers' ? 'relative size-full -scale-x-100' : 'relative size-full'
            }
          >
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(max-width: 1279px) 17vw, 197px"
              className={visual.imageClassName}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function resolveStripLabel(
  category: CategoryTreeNode | undefined,
  slotKey: CategoryStripSlotKey,
  t: (path: string) => string,
): string {
  if (category?.title?.trim()) {
    return category.title;
  }
  return t(SLOT_LABEL_KEYS[slotKey]);
}

export function TopCategories() {
  const { t } = useTranslation();
  const { items, loadingHomeStrip: loading } = useHomeCategoryStrip();

  const categoriesByPosition = useMemo(
    () => mapHomeStripItemsByPosition(items),
    [items],
  );

  if (loading) {
    return (
      <section className={`bg-white ${montserrat.className}`} aria-hidden>
        <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-6 pt-8 lg:pb-40 lg:pt-6 xl:pt-8`}>
          <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] lg:hidden">
            {CATEGORY_STRIP_SLOT_ORDER.map((slotKey) => (
              <div key={slotKey} className="flex shrink-0 flex-col items-center gap-2">
                <div className="size-[65px] animate-pulse rounded-lg bg-[#eceff2]" />
                <div className="h-9 w-20 animate-pulse rounded-full bg-[#eceff2]" />
              </div>
            ))}
          </div>
          <div
            className={`hidden lg:grid ${CATEGORY_STRIP_GRID_COLS[HOME_CATEGORY_STRIP_LIMIT]} lg:items-stretch lg:gap-2 lg:pb-0 xl:gap-3`}
          >
            {CATEGORY_STRIP_SLOT_ORDER.map((slotKey) => (
              <div
                key={slotKey}
                className="min-w-0 aspect-[197/201] animate-pulse rounded-[24px] bg-[#eceff2] xl:rounded-[30px]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-white ${montserrat.className}`} aria-label={t('common.navigation.categories')}>
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-6 pt-8 lg:pb-40 lg:pt-6 xl:pt-8`}>
        <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide lg:hidden">
          {CATEGORY_STRIP_SLOT_ORDER.map((slotKey, index) => {
            const position = index + 1;
            const category = categoriesByPosition.get(position);
            const href = category
              ? categoryStripHref(category)
              : categoryStripHrefForSlot(null, slotKey);
            const imageSrc = resolveCategoryStripImageSrc(slotKey);
            const label = resolveStripLabel(category, slotKey, t);

            return (
              <Link
                key={slotKey}
                href={href}
                className="flex shrink-0 flex-col items-center gap-2 transition-opacity active:opacity-90"
              >
                <TopCategoriesMobileIcon imageSrc={imageSrc} slotKey={slotKey} />
                <span className="shrink-0 rounded-full bg-[#f7f7f7] px-4 py-2 text-sm font-medium leading-normal text-[#303030]">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
        <div
          className={`hidden lg:grid ${CATEGORY_STRIP_GRID_COLS[HOME_CATEGORY_STRIP_LIMIT]} lg:items-stretch lg:gap-2 lg:pb-0 xl:gap-3`}
        >
          {CATEGORY_STRIP_SLOT_ORDER.map((slotKey, index) => {
            const position = index + 1;
            const category = categoriesByPosition.get(position);
            const href = category
              ? categoryStripHref(category)
              : categoryStripHrefForSlot(null, slotKey);
            const visual = getCategoryStripVisual(slotKey);
            const label = resolveStripLabel(category, slotKey, t);

            return (
              <Link
                key={slotKey}
                href={href}
                className={`category-strip-card-cq group relative flex min-w-0 w-full flex-col overflow-hidden rounded-[24px] bg-[#f0f2f4] transition-transform hover:opacity-[0.98] active:scale-[0.99] xl:rounded-[30px] ${categoryStripCardAspectClass(visual)}`}
              >
                <div className="relative h-full w-full min-h-0 overflow-hidden">
                  <CategoryStripDesktopImage slotKey={slotKey} />
                </div>
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex -translate-y-[8px] justify-center px-1.5 pb-2.5 pt-1 text-center xl:px-2 xl:pb-[10px] xl:pt-0 ${
                    visual.tall ? 'xl:pb-3' : ''
                  }`}
                >
                  <span className="line-clamp-2 max-w-full break-words text-[13px] font-bold leading-snug text-[#1c1c1c] [overflow-wrap:anywhere] xl:text-[16px] xl:leading-5">
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
