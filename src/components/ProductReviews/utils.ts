export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/**
 * Format date string to localized date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  // Use browser's default locale for date formatting
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate average rating from reviews
 */
export function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) {
    return 0;
  }
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

export interface RatingDistribution {
  star: number;
  count: number;
  percentage: number;
}

/**
 * Calculate rating distribution
 */
export function calculateRatingDistribution(reviews: Review[]): RatingDistribution[] {
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));
}

