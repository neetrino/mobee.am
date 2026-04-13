'use client';

import { ReviewRating } from './ReviewRating';
import { calculateAverageRating, calculateRatingDistribution, type Review } from './utils';
import { useTranslation } from '../../lib/i18n-client';

interface ReviewSummaryProps {
  reviews: Review[];
}

/**
 * Rating summary and distribution component
 */
export function ReviewSummary({ reviews }: ReviewSummaryProps) {
  const { t } = useTranslation();
  const averageRating = calculateAverageRating(reviews);
  const ratingDistribution = calculateRatingDistribution(reviews);

  return (
    <div className="flex flex-col md:flex-row gap-8 mb-8">
      <div className="flex flex-col items-center md:items-start">
        <div className="text-5xl font-bold text-gray-900 mb-2">
          {averageRating.toFixed(1)}
        </div>
        <ReviewRating
          rating={Math.round(averageRating)}
          hoveredRating={0}
          onRatingChange={() => {}}
          onHover={() => {}}
          size="md"
          interactive={false}
        />
        <div className="text-sm text-gray-600 mt-2">
          {reviews.length} {reviews.length === 1 
            ? t('common.reviews.review')
            : t('common.reviews.reviews')}
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="flex-1">
        {ratingDistribution.map(({ star, count, percentage }) => (
          <div key={star} className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1 w-20">
              <span className="text-sm text-gray-600 w-4">{star}</span>
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}




