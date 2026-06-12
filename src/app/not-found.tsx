'use client';

import Link from 'next/link';
import { Button } from '@shop/ui';
import { useTranslation } from '../lib/i18n-client';

const NOT_FOUND_BADGE_SIZE_PX = 144;
const NOT_FOUND_INNER_RING_INSET_PX = 16;
const NOT_FOUND_CTA_MAX_WIDTH_PX = 400;

/**
 * Custom 404 Not Found Page
 *
 * Displayed when a route is not found. Layout matches storefront empty states.
 */
export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div
          className="relative mb-8 flex items-center justify-center"
          style={{ width: NOT_FOUND_BADGE_SIZE_PX, height: NOT_FOUND_BADGE_SIZE_PX }}
        >
          <div className="absolute inset-0 rounded-full bg-admin-500/10" aria-hidden />
          <div
            className="absolute rounded-full bg-admin-500/5"
            style={{
              inset: NOT_FOUND_INNER_RING_INSET_PX,
            }}
            aria-hidden
          />
          <span
            className="relative text-7xl font-bold tracking-tight text-admin-500 sm:text-8xl"
            aria-hidden
          >
            404
          </span>
        </div>

        <div className="mb-8 flex w-full flex-col items-center gap-4">
          <h1 className="max-w-[284px] text-2xl font-bold leading-[1.2] text-[#1c1b1b] sm:text-3xl">
            {t('common.notFound.title')}
          </h1>
          <p className="w-full text-sm leading-[1.5] tracking-[0.07px] text-[#6f7384] sm:text-base">
            {t('common.notFound.description')}
          </p>
        </div>

        <div
          className="flex w-full flex-col gap-3"
          style={{ maxWidth: NOT_FOUND_CTA_MAX_WIDTH_PX }}
        >
          <Link href="/" className="w-full">
            <Button
              variant="primary"
              size="lg"
              className="h-14 w-full !rounded-full !bg-admin-500 px-8 text-base font-semibold !text-white hover:!bg-admin-600 focus:!ring-admin-500"
            >
              {t('common.notFound.goHome')}
            </Button>
          </Link>
          <Link href="/products" className="w-full">
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full !rounded-full border-2 border-gray-200 px-8 text-base font-semibold text-[#1c1b1b] hover:bg-gray-50 focus:!ring-admin-500"
            >
              {t('common.buttons.browseProducts')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
