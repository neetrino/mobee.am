import { db } from "@white-shop/db";
import type { Prisma } from "@white-shop/db";
import { logger } from "../../utils/logger";

/** Max distinct category slugs in `category=a,b,c` shop URL (same order of magnitude as brand list). */
export const MAX_CATEGORY_SLUGS = 15;

/**
 * Get all child category IDs recursively
 */
export async function getAllChildCategoryIds(parentId: string): Promise<string[]> {
  const children = await db.category.findMany({
    where: {
      parentId: parentId,
      published: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  
  let allChildIds = children.map((c: { id: string }) => c.id);
  
  // Recursively get children of children
  for (const child of children) {
    const grandChildren = await getAllChildCategoryIds(child.id);
    allChildIds = [...allChildIds, ...grandChildren];
  }
  
  return allChildIds;
}

/**
 * Find category by slug with fallback to other languages
 */
export async function findCategoryBySlug(
  categorySlug: string,
  lang: string
): Promise<{ id: string } | null> {
  logger.debug('Looking for category', { category: categorySlug, lang });
  
  let categoryDoc = await db.category.findFirst({
    where: {
      translations: {
        some: {
          slug: categorySlug,
          locale: lang,
        },
      },
      published: true,
      deletedAt: null,
    },
  });

  // If category not found in current language, try to find it in other languages (fallback)
  if (!categoryDoc) {
    logger.warn('Category not found in language, trying other languages', { category: categorySlug, lang });
    categoryDoc = await db.category.findFirst({
      where: {
        translations: {
          some: {
            slug: categorySlug,
          },
        },
        published: true,
        deletedAt: null,
      },
      include: { translations: true },
    });
    
    if (categoryDoc) {
      const foundIn = (categoryDoc as { translations?: Array<{ slug: string; locale: string }> }).translations?.find((t: { slug: string; locale: string }) => t.slug === categorySlug)?.locale || 'unknown';
      logger.info('Category found in different language', { 
        id: categoryDoc.id, 
        slug: categorySlug,
        foundIn
      });
    }
  }

  if (categoryDoc) {
    logger.info('Category found', { id: categoryDoc.id, slug: categorySlug });
  } else {
    logger.warn('Category not found in any language', { category: categorySlug, lang });
  }

  return categoryDoc;
}

/**
 * OR of category trees: each slug expands to primary + descendants (same rules as shop single-category).
 * Invalid slugs are skipped; returns null if none resolve (caller may treat as empty catalog).
 */
export async function buildCategoryTreesOrWhere(
  categoryParam: string,
  lang: string,
): Promise<Prisma.ProductWhereInput | null> {
  const slugs = [
    ...new Set(
      categoryParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_CATEGORY_SLUGS);
  if (slugs.length === 0) {
    return null;
  }

  const treeBlocks: { OR: Prisma.ProductWhereInput[] }[] = [];

  for (const slug of slugs) {
    const categoryDoc = await findCategoryBySlug(slug, lang);
    if (!categoryDoc) {
      continue;
    }
    const childCategoryIds = await getAllChildCategoryIds(categoryDoc.id);
    const allCategoryIds = [categoryDoc.id, ...childCategoryIds];
    const categoryConditions = allCategoryIds.flatMap((catId: string) => [
      { primaryCategoryId: catId },
      { categoryIds: { has: catId } },
    ]);
    treeBlocks.push({ OR: categoryConditions });
  }

  if (treeBlocks.length === 0) {
    return null;
  }
  return treeBlocks.length === 1 ? treeBlocks[0]! : { OR: treeBlocks };
}

