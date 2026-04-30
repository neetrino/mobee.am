'use client';

import { useTranslation } from '../../lib/i18n-client';
import { ReviewItem } from './ReviewItem';
import type { Review } from './utils';

interface ReviewListProps {
  reviews: Review[];
}

/**
 * Reviews list component
 */
export function ReviewList({
  reviews,
}: ReviewListProps) {
  const { t } = useTranslation();

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {t('common.reviews.noReviews')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
        />
      ))}
    </div>
  );
}




