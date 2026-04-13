'use client';

import { Button } from '@shop/ui';
import { useAuth } from '../lib/auth/AuthContext';
import { useTranslation } from '../lib/i18n-client';
import { useReviews } from './ProductReviews/hooks/useReviews';
import { useReviewForm } from './ProductReviews/hooks/useReviewForm';
import { ReviewSummary } from './ProductReviews/ReviewSummary';
import { ReviewForm } from './ProductReviews/ReviewForm';
import { ReviewList } from './ProductReviews/ReviewList';
import { ProductReviewsLoading } from './ProductReviews/ProductReviewsLoading';

interface ProductReviewsProps {
  productId?: string; // For backward compatibility
  productSlug?: string; // Preferred: use slug for API calls
}

export function ProductReviews({ productId, productSlug }: ProductReviewsProps) {
  const { isLoggedIn, user } = useAuth();
  const { t } = useTranslation();
  
  const { reviews, loading, setReviews } = useReviews(productId, productSlug);
  
  const {
    showForm,
    setShowForm,
    rating,
    setRating,
    hoveredRating,
    setHoveredRating,
    comment,
    setComment,
    submitting,
    editingReviewId,
    handleEditReview,
    handleCancelEdit,
    handleSubmit,
    handleUpdateReview,
  } = useReviewForm({
    productId,
    productSlug,
    reviews,
    setReviews,
  });

  // Get user's review if exists
  const userReview = user ? reviews.find(r => r.userId === user.id) : null;

  if (loading) {
    return <ProductReviewsLoading />;
  }

  const handleShowForm = () => {
    if (!isLoggedIn) {
      alert(t('common.reviews.loginRequired'));
      return;
    }
    setShowForm(true);
  };

  const handleLoginRequired = () => {
    alert(t('common.reviews.loginRequired'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {t('common.reviews.title')}
        </h2>

        {/* Rating Summary */}
        <ReviewSummary reviews={reviews} />

        {/* Write Review Button */}
        {!showForm && (
          <Button
            variant="primary"
            onClick={handleShowForm}
            className="mb-8"
          >
            {t('common.reviews.writeReview')}
          </Button>
        )}

        {/* Review Form */}
        {showForm && (
          <ReviewForm
            rating={rating}
            hoveredRating={hoveredRating}
            comment={comment}
            submitting={submitting}
            editingReviewId={editingReviewId}
            onRatingChange={setRating}
            onHover={setHoveredRating}
            onCommentChange={setComment}
            onSubmit={editingReviewId ? handleUpdateReview : handleSubmit}
            onCancel={editingReviewId ? handleCancelEdit : () => {
              setShowForm(false);
              setRating(0);
              setComment('');
            }}
          />
        )}
      </div>

      {/* Reviews List */}
      <ReviewList
        reviews={reviews}
        currentUserId={user?.id}
        showForm={showForm}
        onEditReview={handleEditReview}
        onShowForm={handleShowForm}
        onLoginRequired={handleLoginRequired}
      />
    </div>
  );
}


