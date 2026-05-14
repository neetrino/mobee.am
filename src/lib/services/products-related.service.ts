import { db } from "@white-shop/db";
import { getAllChildCategoryIds } from "./products-find-query/category-utils";
import { productsService } from "./products.service";

export interface RelatedCategorySource {
  id: string;
  primaryCategoryId?: string | null;
  categoryIds?: string[] | null;
  categories?: ReadonlyArray<{ id: string }> | null;
}

type ProductListItem = Awaited<ReturnType<typeof productsService.findAll>>["data"][number];

interface FindRelatedProductsParams {
  product: RelatedCategorySource;
  lang: string;
  limit: number;
}

export function resolveRelatedCategoryIds(product: RelatedCategorySource): string[] {
  const ids: string[] = [];
  const addCategoryId = (categoryId: string | null | undefined) => {
    const normalized = categoryId?.trim();
    if (normalized && !ids.includes(normalized)) {
      ids.push(normalized);
    }
  };

  addCategoryId(product.primaryCategoryId);
  product.categoryIds?.forEach(addCategoryId);
  product.categories?.forEach((category) => addCategoryId(category.id));

  return ids;
}

export function sortProductsByRelatedIds<TProduct extends { id: string }>(
  products: TProduct[],
  relatedIds: string[],
): TProduct[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  return relatedIds
    .map((id) => productById.get(id))
    .filter((product): product is TProduct => Boolean(product));
}

async function expandCategoryIds(categoryIds: string[]): Promise<string[]> {
  const expandedIds = new Set(categoryIds);

  for (const categoryId of categoryIds) {
    const childIds = await getAllChildCategoryIds(categoryId);
    childIds.forEach((childId) => expandedIds.add(childId));
  }

  return [...expandedIds];
}

async function findRelatedProductIds(
  currentProductId: string,
  categoryIds: string[],
  limit: number,
): Promise<string[]> {
  const expandedCategoryIds = await expandCategoryIds(categoryIds);
  if (expandedCategoryIds.length === 0) {
    return [];
  }

  const products = await db.product.findMany({
    where: {
      id: { not: currentProductId },
      published: true,
      deletedAt: null,
      OR: [
        { primaryCategoryId: { in: expandedCategoryIds } },
        { categoryIds: { hasSome: expandedCategoryIds } },
        { categories: { some: { id: { in: expandedCategoryIds } } } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return products.map((product) => product.id);
}

export async function findRelatedProducts({
  product,
  lang,
  limit,
}: FindRelatedProductsParams): Promise<ProductListItem[]> {
  const categoryIds = resolveRelatedCategoryIds(product);
  if (categoryIds.length === 0) {
    return [];
  }

  const relatedIds = await findRelatedProductIds(product.id, categoryIds, limit);
  if (relatedIds.length === 0) {
    return [];
  }

  const relatedResponse = await productsService.findAll({
    ids: relatedIds,
    limit: relatedIds.length,
    page: 1,
    lang,
  });

  return sortProductsByRelatedIds(relatedResponse.data, relatedIds);
}
