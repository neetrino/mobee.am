'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';
import type { LanguageCode } from '../../lib/language';

interface EmptyCartProps {
  t: (key: string) => string;
  lang: LanguageCode;
}

interface EmptyCartContentProps {
  t: (key: string) => string;
}

function EnglishDesktopEmptyCart({ t }: EmptyCartContentProps) {
  return (
    <div className="hidden py-8 lg:flex lg:justify-center">
      <div className="flex w-[328px] flex-col items-center gap-[15px]">
        <Image
          src="/images/cart/empty-cart-basket.png"
          alt={t('common.cart.empty')}
          width={285}
          height={256}
          className="h-auto w-[285px]"
          priority
        />
        <div className="flex w-full flex-col gap-6">
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <h2 className="w-[284px] text-[24px] font-bold leading-[1.2] text-[#1c1b1b]">
              {t('common.cart.empty')}
            </h2>
            <p className="w-full text-[14px] leading-[1.5] tracking-[0.07px] text-[#6f7384]">
              {t('common.cart.emptyDescription')}
            </p>
          </div>
          <Link href="/products" className="w-full">
            <Button variant="primary" size="lg" className="h-14 w-full rounded-[50px] text-sm font-semibold">
              {t('common.cart.exploreCategories')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DefaultEmptyCart({ t }: EmptyCartContentProps) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto max-w-md">
        <Image
          src="https://cdn-icons-png.flaticon.com/512/3081/3081986.png"
          alt={t('common.cart.empty')}
          width={96}
          height={96}
          className="mx-auto mb-4"
        />
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('common.cart.empty')}</h2>
        <Link href="/products">
          <Button variant="primary" size="lg" className="mt-6">
            {t('common.buttons.browseProducts')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function EmptyCart({ t, lang }: EmptyCartProps) {
  const showEnglishDesktopVariant = lang === 'en';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('common.cart.title')}</h1>
      {showEnglishDesktopVariant ? (
        <>
          <EnglishDesktopEmptyCart t={t} />
          <div className="lg:hidden">
            <DefaultEmptyCart t={t} />
          </div>
        </>
      ) : (
        <DefaultEmptyCart t={t} />
      )}
    </div>
  );
}




