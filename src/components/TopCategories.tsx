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
        <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-40 pt-12`}>
          <div className="flex items-end gap-5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            {CATEGORY_STRIP_SLOTS.map((slot) => (
              <div
                key={slot.key}
                className={`shrink-0 rounded-[30px] bg-[#eceff2] ${
                  slot.tall ? 'h-[227px] w-[197px]' : 'h-[201px] w-[197px]'
                } animate-pulse`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-white ${montserrat.className}`} aria-label={t('common.navigation.categories')}>
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-40 pt-12`}>
        <div className="flex items-end justify-start gap-5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory sm:justify-center sm:overflow-visible sm:pb-0">
          {CATEGORY_STRIP_SLOTS.map((slot) => {
            const resolved = resolvedBySlot[slot.key];
            const href = categoryHref(resolved, slot.fallbackSlug);
            const cardHeight = slot.tall ? 'min-h-[227px]' : 'min-h-[201px]';

            return (
              <Link
                key={slot.key}
                href={href}
                className={`group relative flex w-[197px] shrink-0 snap-start flex-col ${cardHeight} overflow-hidden rounded-[30px] bg-[#f0f2f4] transition-transform hover:opacity-[0.98] active:scale-[0.99]`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-2 pb-[22px] pt-2 text-center ${
                    slot.tall ? 'pb-[25px]' : ''
                  }`}
                >
                  <span className="text-[16px] font-bold leading-5 text-[#1c1c1c]">
                    {t(slot.labelKey)}
                  </span>
                </div>
                <div className={`pointer-events-none z-[2] ${slot.imageWrapperClassName}`}>
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
                        sizes="(max-width: 640px) 42vw, 197px"
                        className={slot.imageClassName}
                      />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
