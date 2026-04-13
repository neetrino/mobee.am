/**
 * Product filters interface for admin
 */
export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  categories?: string[];
  sku?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}




