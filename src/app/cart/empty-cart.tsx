'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';
import {
  EMPTY_CART_IMAGE_HEIGHT,
  EMPTY_CART_IMAGE_SRC,
  EMPTY_CART_IMAGE_WIDTH,
} from './constants';
import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';

interface EmptyCartProps {
  t: (key: string) => string;
}

/**
 * Empty cart state aligned with Figma (mobee-new); copy comes from `t()` for all locales.
 */
export function EmptyCart({ t }: EmptyCartProps) {
  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-12`}>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('common.cart.title')}</h1>

      <div className="flex justify-center py-8">
        <div className="flex w-full max-w-[328px] flex-col items-center gap-[15px]">
          <Image
            src={EMPTY_CART_IMAGE_SRC}
            alt={t('common.cart.empty')}
            width={EMPTY_CART_IMAGE_WIDTH}
            height={EMPTY_CART_IMAGE_HEIGHT}
            className="h-auto w-full max-w-[285px]"
            priority
          />
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <h2 className="w-full max-w-[284px] text-[24px] font-bold leading-[1.2] text-[#1c1b1b]">
                {t('common.cart.empty')}
              </h2>
              <p className="w-full text-[14px] leading-[1.5] tracking-[0.07px] text-[#6f7384]">
                {t('common.cart.emptyDescription')}
              </p>
            </div>
            <Link href="/products" className="w-full">
              <Button
                variant="primary"
                size="lg"
                className="h-14 w-full !rounded-full !bg-admin-500 px-[10px] text-[14px] font-semibold leading-normal !text-white hover:!bg-admin-500 focus:!ring-admin-500"
              >
                {t('common.cart.exploreCategories')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
