import type { RelatedProductsContext } from '@/components/hooks/useRelatedProducts';

type ProductCategorySource = {
  id: string;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  categories?: ReadonlyArray<{ id: string }> | null;
};

/** Build related API context from loaded product — skips full slug lookup on related route. */
export function buildRelatedProductsContextFromProduct(
  product: ProductCategorySource,
): RelatedProductsContext {
  const categoryIdSet = new Set<string>();

  if (product.primaryCategoryId?.trim()) {
    categoryIdSet.add(product.primaryCategoryId.trim());
  }

  product.categoryIds?.forEach((categoryId) => {
    const normalized = categoryId?.trim();
    if (normalized) {
      categoryIdSet.add(normalized);
    }
  });

  product.categories?.forEach((category) => {
    const normalized = category.id?.trim();
    if (normalized) {
      categoryIdSet.add(normalized);
    }
  });

  return {
    productId: product.id,
    primaryCategoryId: product.primaryCategoryId ?? null,
    categoryIds: [...categoryIdSet],
  };
}
