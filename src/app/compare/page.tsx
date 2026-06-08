'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { useAuth } from '../../lib/auth/AuthContext';
import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';
import { CompareGroupTable } from './CompareGroupTable';
import { CompareTableSkeleton } from './CompareTableSkeleton';
import { useComparePageData } from './useComparePageData';
import {
  COMPARE_EMPTY_STATE_DESCRIPTION_CLASS,
  COMPARE_EMPTY_STATE_HEADLINE_STACK_CLASS,
  COMPARE_EMPTY_STATE_IMAGE_DISPLAY_CLASS,
  COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_HEIGHT_PX,
  COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_WIDTH_PX,
  COMPARE_EMPTY_STATE_IMAGE_SIZES_ATTR,
  COMPARE_EMPTY_STATE_IMAGE_SRC,
  COMPARE_EMPTY_STATE_TEXT_BLOCK_CLASS,
  COMPARE_EMPTY_STATE_TITLE_CLASS,
  COMPARE_EMPTY_STATE_WRAPPER_CLASS,
} from './compare-layout.constants';
import { EMPTY_COMPARE_ILLUSTRATION_SRC } from '../../lib/empty-state/empty-state-images.constants';
import { usePreloadEmptyStateImage } from '../../lib/empty-state/usePreloadEmptyStateImage';

/**
 * Compare page: one table per category; up to four products per category block.
 */
export default function ComparePage() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  usePreloadEmptyStateImage(EMPTY_COMPARE_ILLUSTRATION_SRC);

  const { products, loading, currency, groupedSections, addToCartInFlightRef, handleRemove } =
    useComparePageData(t);

  const showInitialSkeleton = loading && products.length === 0;

  if (showInitialSkeleton) {
    return <CompareTableSkeleton />;
  }

  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-6`}>
      <div className="mb-8 mt-3 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('common.compare.title')}</h1>
      </div>

      {products.length > 0 ? (
        <div>
          {groupedSections.map((section) => (
            <CompareGroupTable
              key={section.sectionDomId}
              sectionDomId={section.sectionDomId}
              categoryHeading={section.categoryHeading}
              compareSummaryLine={section.compareSummaryLine}
              products={section.products}
              currency={currency}
              isLoggedIn={isLoggedIn}
              t={t}
              addToCartInFlightRef={addToCartInFlightRef}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <div className={COMPARE_EMPTY_STATE_WRAPPER_CLASS}>
          <Image
            src={COMPARE_EMPTY_STATE_IMAGE_SRC}
            alt={t('common.compare.empty')}
            width={COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_WIDTH_PX}
            height={COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_HEIGHT_PX}
            sizes={COMPARE_EMPTY_STATE_IMAGE_SIZES_ATTR}
            className={COMPARE_EMPTY_STATE_IMAGE_DISPLAY_CLASS}
            priority
            fetchPriority="high"
          />
          <div className={COMPARE_EMPTY_STATE_TEXT_BLOCK_CLASS}>
            <div className={COMPARE_EMPTY_STATE_HEADLINE_STACK_CLASS}>
              <h2 className={COMPARE_EMPTY_STATE_TITLE_CLASS}>{t('common.compare.empty')}</h2>
              <p className={COMPARE_EMPTY_STATE_DESCRIPTION_CLASS}>{t('common.compare.emptyDescription')}</p>
            </div>
            <Link href="/products" className="w-full">
              <Button
                variant="primary"
                size="lg"
                className="h-14 w-full !rounded-full !bg-admin-500 px-2.5 text-base font-semibold leading-normal !text-white hover:!bg-admin-500 active:!bg-admin-500 focus:!ring-admin-500 focus:!ring-offset-2"
              >
                {t('common.compare.browseProducts')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
