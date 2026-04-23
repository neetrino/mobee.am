'use client';

import { useTranslation } from '../lib/i18n-client';
import { useReviews } from './ProductReviews/hooks/useReviews';
import { ReviewSummary } from './ProductReviews/ReviewSummary';
import { ReviewList } from './ProductReviews/ReviewList';
import { ProductReviewsLoading } from './ProductReviews/ProductReviewsLoading';

interface ProductReviewsProps {
  productId?: string; // For backward compatibility
  productSlug?: string; // Preferred: use slug for API calls
}

export function ProductReviews({ productId, productSlug }: ProductReviewsProps) {
  const { t } = useTranslation();
  const { reviews, loading } = useReviews(productId, productSlug);

  if (loading) {
    return <ProductReviewsLoading />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {t('common.reviews.title')}
        </h2>

        {/* Rating Summary */}
        <ReviewSummary reviews={reviews} />
      </div>

      {/* Reviews List */}
      <ReviewList reviews={reviews} />
    </div>
  );
}


