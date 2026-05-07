'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useMemo } from 'react';
import { useCategoriesTree } from './CategoriesTreeContext';
import {
  ACCESSORIES_SLUG_PARTS,
  COMPUTERS_SLUG_PARTS,
  findCategoryBySlugParts,
  HEADPHONES_SLUG_PARTS,
  PHONES_SLUG_PARTS,
  TABLETS_SLUG_PARTS,
  type CategoryTreeNode,
  WATCHES_SLUG_PARTS,
} from '../lib/category-nav';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['700'],
  display: 'swap',
});

type SlotKey =
  | 'computers'
  | 'phones'
  | 'tablets'
  | 'watches'
  | 'headphones'
  | 'accessories';

/** Same slots as desktop strip so every category has a labeled pill on mobile. */
const MOBILE_CATEGORY_PILL_KEYS: readonly SlotKey[] = [
  'computers',
  'phones',
  'tablets',
  'watches',
  'headphones',
  'accessories',
];

interface CategorySlot {
  key: SlotKey;
  fallbackSlug: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  labelKey: `common.mainHeader.${string}`;
  tall: boolean;
  imageWrapperClassName: string;
  imageClassName: string;
}

const CATEGORY_STRIP_SLOTS: readonly CategorySlot[] = [
  {
    key: 'computers',
    fallbackSlug: 'computers',
    imageSrc: '/images/home/category-strip/computers.png',
    imageWidth: 146,
    imageHeight: 146,
    labelKey: 'common.mainHeader.computersLink',
    tall: false,
    imageWrapperClassName:
      'absolute left-[31px] top-[24px] flex size-[146px] items-center justify-center',
    imageClassName: 'object-contain',
  },
  {
    key: 'phones',
    fallbackSlug: 'phones',
    imageSrc: '/images/home/category-strip/phones.png',
    imageWidth: 127,
    imageHeight: 127,
    labelKey: 'common.mainHeader.phonesLink',
    tall: false,
    imageWrapperClassName: 'absolute left-[31px] top-[24px] size-[127px]',
    imageClassName: 'object-cover',
  },
  {
    key: 'tablets',
    fallbackSlug: 'tablets',
    imageSrc: '/images/home/category-strip/tablets.png',
    imageWidth: 128,
    imageHeight: 128,
    labelKey: 'common.mainHeader.tabletsLink',
    tall: false,
    imageWrapperClassName: 'absolute left-[34px] top-[23px] size-[128px]',
    imageClassName: 'object-cover',
  },
  {
    key: 'watches',
    fallbackSlug: 'watches',
    imageSrc: '/images/home/category-strip/watches.png',
    imageWidth: 154,
    imageHeight: 154,
    labelKey: 'common.mainHeader.watchesLink',
    tall: false,
    imageWrapperClassName:
      'absolute left-[20px] top-[9px] flex size-[154px] items-center justify-center',
    imageClassName: 'object-cover',
  },
  {
    key: 'headphones',
    fallbackSlug: 'headphones',
    imageSrc: '/images/home/category-strip/headphones.png',
    imageWidth: 146,
    imageHeight: 146,
    labelKey: 'common.mainHeader.headphonesLink',
    tall: false,
    imageWrapperClassName: 'absolute left-[25px] top-[10px] size-[146px]',
    imageClassName: 'object-cover',
  },
  {
    key: 'accessories',
    fallbackSlug: 'accessories',
    imageSrc: '/images/home/category-strip/accessories.png',
    imageWidth: 134,
    imageHeight: 134,
    labelKey: 'common.mainHeader.accessoriesLink',
    tall: false,
    imageWrapperClassName: 'absolute left-[31px] top-[21px] size-[134px]',
    imageClassName: 'object-contain',
  },
];

function categoryStripCardAspectClass(slot: CategorySlot): string {
  return slot.tall ? 'aspect-[197/227]' : 'aspect-[197/201]';
}

function categoryStripInnerHeightClass(slot: CategorySlot): string {
  return slot.tall ? 'h-[227px]' : 'h-[201px]';
}

function categoryHref(resolved: CategoryTreeNode | null, fallbackSlug: string): string {
  if (resolved) {
    return `/products?category=${encodeURIComponent(resolved.slug)}`;
  }
  return `/products?category=${encodeURIComponent(fallbackSlug)}`;
}

export function TopCategories() {
  const { t } = useTranslation();
  const { categories, loadingCategories: loading } = useCategoriesTree();

  const resolvedBySlot = useMemo(() => {
    return {
      computers: findCategoryBySlugParts(categories, COMPUTERS_SLUG_PARTS),
      phones: findCategoryBySlugParts(categories, PHONES_SLUG_PARTS),
      tablets: findCategoryBySlugParts(categories, TABLETS_SLUG_PARTS),
      watches: findCategoryBySlugParts(categories, WATCHES_SLUG_PARTS),
      headphones: findCategoryBySlugParts(categories, HEADPHONES_SLUG_PARTS),
      accessories: findCategoryBySlugParts(categories, ACCESSORIES_SLUG_PARTS),
    };
  }, [categories]);

  if (loading) {
    return (
      <section className={`bg-white ${montserrat.className}`} aria-hidden>
        <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-6 pt-3 lg:pb-40 lg:pt-6 xl:pt-8`}>
          <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] lg:hidden">
            {MOBILE_CATEGORY_PILL_KEYS.map((key) => (
              <div
                key={key}
                className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-[#eceff2]"
              />
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-6 lg:items-stretch lg:gap-2 lg:pb-0 xl:gap-3">
            {CATEGORY_STRIP_SLOTS.map((slot) => (
              <div
                key={slot.key}
                className={`min-w-0 animate-pulse rounded-[24px] bg-[#eceff2] xl:rounded-[30px] ${categoryStripCardAspectClass(slot)}`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-white ${montserrat.className}`} aria-label={t('common.navigation.categories')}>
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-6 pt-3 lg:pb-40 lg:pt-6 xl:pt-8`}>
        <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide lg:hidden">
          {MOBILE_CATEGORY_PILL_KEYS.map((key) => {
            const slot = CATEGORY_STRIP_SLOTS.find((s) => s.key === key);
            if (!slot) {
              return null;
            }
            const resolved = resolvedBySlot[slot.key];
            const href = categoryHref(resolved, slot.fallbackSlug);
            const pillLabel = t(`home.mobile_home.categoryPill.${slot.key}` as const);
            return (
              <Link
                key={slot.key}
                href={href}
                className="shrink-0 rounded-full bg-[#f7f7f7] px-4 py-2 text-sm font-medium leading-normal text-[#303030] transition-opacity active:opacity-90"
              >
                {pillLabel}
              </Link>
            );
          })}
        </div>
        <div className="hidden lg:grid lg:grid-cols-6 lg:items-stretch lg:gap-2 lg:pb-0 xl:gap-3">
          {CATEGORY_STRIP_SLOTS.map((slot) => {
            const resolved = resolvedBySlot[slot.key];
            const href = categoryHref(resolved, slot.fallbackSlug);
            const innerH = categoryStripInnerHeightClass(slot);

            return (
              <Link
                key={slot.key}
                href={href}
                className={`category-strip-card-cq group relative flex min-w-0 w-full flex-col overflow-hidden rounded-[24px] bg-[#f0f2f4] transition-transform hover:opacity-[0.98] active:scale-[0.99] xl:rounded-[30px] ${categoryStripCardAspectClass(slot)}`}
              >
                <div className="relative h-full w-full min-h-0 overflow-hidden">
                  <div
                    className={`category-strip-tile-art absolute left-1/2 top-0 z-0 w-[197px] origin-top will-change-transform ${innerH}`}
                  >
                    <div className={`pointer-events-none z-[1] ${slot.imageWrapperClassName}`}>
                      {slot.key === 'watches' ? (
                        <div className="flex size-full items-center justify-center">
                          <div className="flex-none -rotate-[5.85deg]">
                            <div className="relative size-[140px]">
                              <Image
                                src={slot.imageSrc}
                                alt=""
                                width={slot.imageWidth}
                                height={slot.imageHeight}
                                className={`size-full max-w-none ${slot.imageClassName}`}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={
                            slot.key === 'computers'
                              ? 'relative size-full -scale-x-100'
                              : 'relative size-full'
                          }
                        >
                          <Image
                            src={slot.imageSrc}
                            alt=""
                            fill
                            sizes="(max-width: 1279px) 17vw, 197px"
                            className={slot.imageClassName}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-1.5 pb-2.5 pt-1 text-center xl:px-2 xl:pb-[10px] xl:pt-0 ${
                    slot.tall ? 'xl:pb-3' : ''
                  }`}
                >
                  <span className="line-clamp-2 max-w-full break-words text-[13px] font-bold leading-snug text-[#1c1c1c] [overflow-wrap:anywhere] xl:text-[16px] xl:leading-5">
                    {t(slot.labelKey)}
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

