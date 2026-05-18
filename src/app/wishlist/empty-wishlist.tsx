'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';

import {
  EMPTY_WISHLIST_FRAME_CLASS,
  EMPTY_WISHLIST_ILLUSTRATION_HEIGHT_PX,
  EMPTY_WISHLIST_ILLUSTRATION_PATH,
  EMPTY_WISHLIST_ILLUSTRATION_WIDTH_PX,
  EMPTY_WISHLIST_IMAGE_SIZES,
} from './empty-wishlist.constants';

export interface EmptyWishlistProps {
  t: (key: string) => string;
}

/**
 * Empty wishlist state — layout matches Figma mobee-new (183:1986) for all locales.
 * Frame 256×247, content max 328px, headline max 284px, gaps 28 / 24 / 16px, image crop per Figma export.
 */
export function EmptyWishlist({ t }: EmptyWishlistProps) {
  return (
    <div className="flex w-full flex-col items-center gap-7 pb-8 pt-4">
      <div className={EMPTY_WISHLIST_FRAME_CLASS}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src={EMPTY_WISHLIST_ILLUSTRATION_PATH}
            alt={t('common.wishlist.empty')}
            width={EMPTY_WISHLIST_ILLUSTRATION_WIDTH_PX}
            height={EMPTY_WISHLIST_ILLUSTRATION_HEIGHT_PX}
            sizes={EMPTY_WISHLIST_IMAGE_SIZES}
            priority
            fetchPriority="high"
            className="absolute left-[-50.18%] top-[-93.23%] h-[293.01%] max-w-none w-[189.72%]"
          />
        </div>
      </div>

      <div className="flex w-full max-w-[328px] shrink-0 flex-col items-center gap-6 px-4">
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <h2 className="max-w-[284px] text-2xl font-bold leading-[1.2] text-[#1c1b1b]">
            {t('common.wishlist.empty')}
          </h2>
          <p className="w-full max-w-[328px] text-sm leading-[1.5] tracking-[0.07px] text-[#6f7384]">
            {t('common.wishlist.emptyDescription')}
          </p>
        </div>
        <Link href="/products" className="w-full">
          <Button
            variant="primary"
            size="lg"
            className="h-14 w-full !rounded-full !bg-admin-500 px-2.5 text-base font-semibold leading-normal !text-white hover:!bg-admin-500 active:!bg-admin-500 focus:!ring-admin-500 focus:!ring-offset-2"
          >
            {t('common.wishlist.emptyBrowseCta')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
