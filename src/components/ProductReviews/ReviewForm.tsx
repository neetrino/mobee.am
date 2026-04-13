'use client';

import type { FormEvent } from 'react';
import { Button } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { ReviewRating } from './ReviewRating';

interface ReviewFormProps {
  rating: number;
  hoveredRating: number;
  comment: string;
  submitting: boolean;
  editingReviewId: string | null;
  onRatingChange: (rating: number) => void;
  onHover: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

/**
 * Review form component
 */
export function ReviewForm({
  rating,
  hoveredRating,
  comment,
  submitting,
  editingReviewId,
  onRatingChange,
  onHover,
  onCommentChange,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        {editingReviewId ? 'Update Your Review' : t('common.reviews.writeReview')}
      </h3>

      {/* Rating Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('common.reviews.rating')} *
        </label>
        <ReviewRating
          rating={rating}
          hoveredRating={hoveredRating}
          onRatingChange={onRatingChange}
          onHover={onHover}
          size="lg"
          interactive
        />
      </div>

      {/* Comment Textarea */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('common.reviews.comment')} *
        </label>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder={t('common.reviews.commentPlaceholder')}
          required
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
        >
          {submitting
            ? t('common.reviews.submitting')
            : editingReviewId
              ? 'Update Review'
              : t('common.reviews.submitReview')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          {t('common.buttons.cancel')}
        </Button>
      </div>
    </form>
  );
}




