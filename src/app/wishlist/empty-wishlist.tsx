'use client';

import Link from 'next/link';
import { Button } from '@shop/ui';

import type { LanguageCode } from '../../lib/language';

const ENGLISH_DESKTOP_EMPTY_WISHLIST_IMAGE =
  'https://www.figma.com/api/mcp/asset/677772e4-040f-45ba-8eee-fe2a28e3191c';

interface EmptyWishlistProps {
  t: (key: string) => string;
  lang: LanguageCode;
}

interface EmptyWishlistContentProps {
  t: (key: string) => string;
}

function EnglishDesktopEmptyWishlist({ t }: EmptyWishlistContentProps) {
  return (
    <div className="hidden pb-8 pt-4 lg:flex lg:justify-center">
      <div className="flex w-[328px] flex-col items-center gap-[15px]">
        <div className="w-[328px] overflow-hidden">
          <img
            src={ENGLISH_DESKTOP_EMPTY_WISHLIST_IMAGE}
            alt={t('common.wishlist.empty')}
            width={428}
            height={384}
            className="mx-auto h-[384px] w-[428px] max-w-none -translate-x-[15%] object-cover object-center"
            loading="eager"
          />
        </div>
        <div className="flex w-full flex-col gap-6">
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <h2 className="w-[284px] text-[24px] font-bold leading-[1.2] text-[#1c1b1b]">
              {t('common.wishlist.empty')}
            </h2>
            <p className="w-full text-[14px] leading-[1.5] tracking-[0.07px] text-[#6f7384]">
              {t('common.wishlist.emptyDescription')}
            </p>
          </div>
          <Link href="/products" className="w-full">
            <Button
              variant="primary"
              size="lg"
              className="h-14 w-full rounded-[50px] bg-[#2DB2FF] px-[10px] text-[14px] font-semibold leading-normal text-white hover:bg-[#2DB2FF] focus:ring-[#2DB2FF]"
            >
              {t('common.buttons.browseProducts')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DefaultEmptyWishlist({ t }: EmptyWishlistContentProps) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto max-w-md">
        <svg
          className="mx-auto h-24 w-24 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('common.wishlist.empty')}</h2>
        <p className="text-gray-600 mb-6">{t('common.wishlist.emptyDescription')}</p>
        <Link href="/products">
          <Button variant="primary" size="lg">
            {t('common.buttons.browseProducts')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function EmptyWishlist({ t, lang }: EmptyWishlistProps) {
  const showEnglishDesktopVariant = lang === 'en';

  return showEnglishDesktopVariant ? (
    <>
      <EnglishDesktopEmptyWishlist t={t} />
      <div className="lg:hidden">
        <DefaultEmptyWishlist t={t} />
      </div>
    </>
  ) : (
    <DefaultEmptyWishlist t={t} />
  );
}
