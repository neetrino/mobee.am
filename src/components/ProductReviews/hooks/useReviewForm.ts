'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { apiClient } from '../../../lib/api-client';
import { showToast } from '../../Toast';
import type { Review } from '../utils';

interface UseReviewFormProps {
  productId?: string;
  productSlug?: string;
  reviews: Review[];
  setReviews: (reviews: Review[] | ((prev: Review[]) => Review[])) => void;
  onReviewUpdated?: () => void;
}

/**
 * Hook for managing review form state and submission
 */
export function useReviewForm({
  productId,
  productSlug,
  reviews,
  setReviews,
  onReviewUpdated,
}: UseReviewFormProps) {
  const { isLoggedIn, user } = useAuth();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const handleEditReview = (review: Review) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment || '');
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setRating(0);
    setComment('');
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      showToast(t('common.reviews.loginRequired'), 'warning');
      return;
    }

    if (rating === 0) {
      showToast(t('common.reviews.ratingRequired'), 'warning');
      return;
    }

    if (!comment.trim()) {
      showToast(t('common.reviews.commentRequired'), 'warning');
      return;
    }

    setSubmitting(true);

    try {
      // Use slug if available, otherwise fall back to productId
      const identifier = productSlug || productId;
      if (!identifier) {
        showToast(t('common.reviews.submitError'), 'error');
        return;
      }

      console.log('📝 [PRODUCT REVIEWS] Submitting review:', { identifier, rating, commentLength: comment.length });
      
      const newReview = await apiClient.post<Review>(`/api/v1/products/${identifier}/reviews`, {
        rating,
        comment: comment.trim(),
      });

      console.log('✅ [PRODUCT REVIEWS] Review submitted successfully:', newReview.id);

      // Add new review to the list
      setReviews([newReview, ...reviews]);
      setRating(0);
      setComment('');
      setShowForm(false);
      
      // Dispatch event to update rating on product page
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('review-updated'));
      }
      
      onReviewUpdated?.();
    } catch (error: unknown) {
      console.error('❌ [PRODUCT REVIEWS] Error submitting review:', error);
      
      const err = error as { status?: number };
      
      // Handle specific error cases
      if (err.status === 409) {
        // User already has a review - load it and show in edit mode
        try {
          const identifier = productSlug || productId;
          if (!identifier) {
            showToast(t('common.reviews.alreadyReviewed') || 'You have already reviewed this product', 'info');
            return;
          }

          console.log('📝 [PRODUCT REVIEWS] Loading existing review for user');
          const existingReview = await apiClient.get<Review>(`/api/v1/products/${identifier}/reviews?my=true`);
          
          if (existingReview) {
            // Add to reviews list if not already there
            const reviewExists = reviews.some(r => r.id === existingReview.id);
            if (!reviewExists) {
              setReviews([existingReview, ...reviews]);
            }
            
            // Show in edit mode
            handleEditReview(existingReview);
            showToast(
              t('common.reviews.alreadyReviewed') ||
                'You have already reviewed this product. You can update your review below.',
              'info',
            );
          } else {
            showToast(t('common.reviews.alreadyReviewed') || 'You have already reviewed this product', 'info');
          }
        } catch (loadError: unknown) {
          console.error('❌ [PRODUCT REVIEWS] Error loading existing review:', loadError);
          // Fallback to checking local reviews
          const userReview = user ? reviews.find(r => r.userId === user.id) : null;
          if (userReview) {
            handleEditReview(userReview);
            showToast(
              t('common.reviews.alreadyReviewed') ||
                'You have already reviewed this product. You can update your review below.',
              'info',
            );
          } else {
            showToast(t('common.reviews.alreadyReviewed') || 'You have already reviewed this product', 'info');
          }
        }
      } else if (err.status === 401) {
        showToast(t('common.reviews.loginRequired'), 'warning');
      } else {
        showToast(t('common.reviews.submitError'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReview = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn || !editingReviewId) {
      return;
    }

    if (rating === 0) {
      showToast(t('common.reviews.ratingRequired'), 'warning');
      return;
    }

    if (!comment.trim()) {
      showToast(t('common.reviews.commentRequired'), 'warning');
      return;
    }

    setSubmitting(true);

    try {
      console.log('📝 [PRODUCT REVIEWS] Updating review:', { reviewId: editingReviewId, rating, commentLength: comment.length });
      
      const updatedReview = await apiClient.put<Review>(`/api/v1/reviews/${editingReviewId}`, {
        rating,
        comment: comment.trim(),
      });

      console.log('✅ [PRODUCT REVIEWS] Review updated successfully:', updatedReview.id);

      // Update review in the list
      setReviews(reviews.map(r => r.id === editingReviewId ? updatedReview : r));
      setRating(0);
      setComment('');
      setEditingReviewId(null);
      setShowForm(false);
      
      // Dispatch event to update rating on product page
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('review-updated'));
      }
      
      onReviewUpdated?.();
    } catch (error: unknown) {
      console.error('❌ [PRODUCT REVIEWS] Error updating review:', error);
      
      const err = error as { status?: number };
      
      // Handle specific error cases
      if (err.status === 401) {
        showToast(t('common.reviews.loginRequired'), 'warning');
      } else if (err.status === 403) {
        showToast('You can only update your own reviews', 'error');
      } else {
        showToast(t('common.reviews.submitError'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
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
  };
}




