import { db } from "@white-shop/db";
import { logger } from "@/lib/utils/logger";
import {
  buildCategoryMediaFromImageUrl,
  extractCategoryImageUrl,
} from "@/lib/categoryMedia";
import { DEFAULT_LANGUAGE } from "@/lib/language";
import { getCategoryProductCountMap } from "@/lib/services/admin/category-product-counts";
import { cacheService } from "@/lib/services/cache.service";
import { toSlug } from "@/lib/utils/slug";
import { invalidateCatalogCaches } from "@/lib/catalog/invalidate-catalog-cache";

const ADMIN_CATEGORY_LOCALE = DEFAULT_LANGUAGE;

async function clearCategoriesCache(): Promise<void> {
  await cacheService.deletePattern("categories:*");
  await invalidateCatalogCaches();
}

function resolveCategorySlug(explicitSlug: string | undefined, title: string): string {
  const fromExplicit = explicitSlug !== undefined ? toSlug(explicitSlug) : "";
  if (fromExplicit) {
    return fromExplicit;
  }
  return toSlug(title);
}

class AdminCategoriesService {
  /**
   * Get categories for admin
   */
  async getCategories() {
    const categories = await db.category.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        parentId: true,
        position: true,
        requiresSizes: true,
        homeStripPosition: true,
        media: true,
        translations: {
          where: { locale: ADMIN_CATEGORY_LOCALE },
          take: 1,
          select: { title: true, slug: true },
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    const activeCategoryIds = new Set(categories.map((category) => category.id));
    const productCountMap = await getCategoryProductCountMap(categories.map((category) => category.id));

    return {
      data: categories.map((category: {
        id: string;
        parentId: string | null;
        position: number;
        requiresSizes: boolean | null;
        homeStripPosition: number | null;
        media: unknown;
        translations?: Array<{ title: string; slug: string }>;
      }) => {
        const translations = Array.isArray(category.translations) ? category.translations : [];
        const translation = translations[0] || null;
        const parentId =
          category.parentId && activeCategoryIds.has(category.parentId)
            ? category.parentId
            : null;

        return {
          id: category.id,
          title: translation?.title || "",
          slug: translation?.slug || "",
          parentId,
          position: category.position,
          requiresSizes: category.requiresSizes || false,
          showOnHomePage: category.homeStripPosition !== null,
          imageUrl: extractCategoryImageUrl(category.media),
          productCount: productCountMap.get(category.id) ?? 0,
        };
      }),
    };
  }

  /**
   * Create category
   */
  async createCategory(data: {
    title: string;
    slug?: string;
    locale?: string;
    parentId?: string;
    requiresSizes?: boolean;
    imageUrl?: string | null;
  }) {
    const locale = data.locale || ADMIN_CATEGORY_LOCALE;
    
    // Validate parent category exists if parentId is provided
    if (data.parentId) {
      const parentCategory = await db.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parentCategory) {
        throw {
          status: 404,
          type: "https://api.shop.am/problems/not-found",
          title: "Parent category not found",
          detail: `Parent category with id '${data.parentId}' does not exist`,
        };
      }
    }
    
    const slug = resolveCategorySlug(data.slug, data.title);
    if (!slug) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Invalid slug",
        detail: "Category slug is required. Use Latin letters, numbers, and hyphens.",
      };
    }

    await this.assertSlugAvailable(slug, locale);

    const nextPosition = await this.getNextSiblingPosition(data.parentId ?? null);

    const category = await db.category.create({
      data: {
        parentId: data.parentId || undefined,
        position: nextPosition,
        requiresSizes: data.requiresSizes || false,
        published: true,
        media: buildCategoryMediaFromImageUrl(data.imageUrl ?? null),
        translations: {
          create: {
            locale,
            title: data.title,
            slug,
            fullPath: slug, // Can be enhanced to build full path
          },
        },
      },
      include: {
        translations: true,
      },
    });

    const refreshedCategory = await db.category.findUnique({
      where: { id: category.id },
      include: { translations: true },
    });

    const categoryTranslations = Array.isArray(refreshedCategory?.translations)
      ? refreshedCategory.translations
      : [];
    const translation =
      categoryTranslations.find((t: { locale: string }) => t.locale === locale) ||
      categoryTranslations[0] ||
      null;
    await clearCategoriesCache();

    return {
      data: {
        id: category.id,
        title: translation?.title || "",
        slug: translation?.slug || "",
        parentId: category.parentId,
        requiresSizes: category.requiresSizes || false,
        imageUrl: extractCategoryImageUrl(refreshedCategory?.media),
      },
    };
  }

  /**
   * Get category by ID with children
   */
  async getCategoryById(categoryId: string) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        translations: {
          where: { locale: ADMIN_CATEGORY_LOCALE },
          take: 1,
        },
        children: {
          include: {
            translations: {
              where: { locale: ADMIN_CATEGORY_LOCALE },
              take: 1,
            },
          },
        },
      },
    });

    if (!category) {
      return null;
    }

    const translations = Array.isArray(category.translations) ? category.translations : [];
    const translation = translations[0] || null;

    return {
      id: category.id,
      title: translation?.title || "",
      slug: translation?.slug || "",
      parentId: category.parentId,
      requiresSizes: category.requiresSizes || false,
      imageUrl: extractCategoryImageUrl(category.media),
      children: category.children.map((child: { id: string; parentId: string | null; requiresSizes: boolean | null; translations?: Array<{ title: string; slug: string }> }) => {
        const childTranslations = Array.isArray(child.translations) ? child.translations : [];
        const childTranslation = childTranslations[0] || null;
        return {
          id: child.id,
          title: childTranslation?.title || "",
          slug: childTranslation?.slug || "",
          parentId: child.parentId,
          requiresSizes: child.requiresSizes || false,
        };
      }),
    };
  }

  /**
   * Update category
   */
  async updateCategory(categoryId: string, data: {
    title?: string;
    slug?: string;
    locale?: string;
    parentId?: string | null;
    requiresSizes?: boolean;
    subcategoryIds?: string[];
    imageUrl?: string | null;
  }) {
    const locale = data.locale || ADMIN_CATEGORY_LOCALE;
    
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        translations: true,
      },
    });

    if (!category) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Category not found",
        detail: `Category with id '${categoryId}' does not exist`,
      };
    }

    // Prevent circular reference (category cannot be its own parent)
    if (data.parentId === categoryId) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Invalid parent",
        detail: "Category cannot be its own parent",
      };
    }

    // Prevent setting parent to a child category (would create circular reference)
    if (data.parentId) {
      const potentialParent = await db.category.findUnique({
        where: { id: data.parentId },
        include: {
          children: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

      if (!potentialParent) {
        throw {
          status: 404,
          type: "https://api.shop.am/problems/not-found",
          title: "Parent category not found",
          detail: `Parent category with id '${data.parentId}' does not exist`,
        };
      }

      // Parent cannot be a descendant of the category being edited (would create a cycle).
      const parentIsDescendant = await this.isCategoryDescendant(categoryId, data.parentId);
      if (parentIsDescendant) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/bad-request",
          title: "Circular reference",
          detail: "Cannot set parent to a category that is a descendant of this category",
        };
      }
    }

    // Update subcategories if provided
    if (data.subcategoryIds !== undefined) {
      // First, remove all existing children relationships
      await db.category.updateMany({
        where: { parentId: categoryId },
        data: { parentId: null },
      });

      // Then, set new children relationships (prevent circular references)
      if (data.subcategoryIds.length > 0) {
        // Filter out the category itself and its descendants
        const validSubcategoryIds = data.subcategoryIds.filter(id => id !== categoryId);
        
        // Check for circular references
        for (const subId of validSubcategoryIds) {
          const isDescendant = await this.isCategoryDescendant(categoryId, subId);
          if (isDescendant) {
            throw {
              status: 400,
              type: "https://api.shop.am/problems/bad-request",
              title: "Circular reference",
              detail: "Cannot set a descendant category as subcategory",
            };
          }
        }

        if (validSubcategoryIds.length > 0) {
          await db.category.updateMany({
            where: { 
              id: { in: validSubcategoryIds },
            },
            data: { parentId: categoryId },
          });
        }
      }
    }

    const updateData: {
      parentId?: string | null;
      requiresSizes?: boolean;
      media?: { url: string }[];
    } = {};

    if (data.parentId !== undefined) {
      updateData.parentId = data.parentId || null;
    }

    if (data.requiresSizes !== undefined) {
      updateData.requiresSizes = data.requiresSizes;
    }

    if (data.imageUrl !== undefined) {
      updateData.media = buildCategoryMediaFromImageUrl(data.imageUrl);
    }

    // Keep all locale rows in sync so storefront language switches stay consistent.
    if (data.title !== undefined || data.slug !== undefined) {
      const categoryTranslations = Array.isArray(category.translations) ? category.translations : [];
      const existingTranslation =
        categoryTranslations.find((t: { locale: string }) => t.locale === locale) ||
        categoryTranslations[0] ||
        null;

      const nextTitle = data.title?.trim() || existingTranslation?.title || "";
      if (!nextTitle) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/bad-request",
          title: "Invalid title",
          detail: "Category title is required",
        };
      }

      const nextSlug =
        data.slug !== undefined
          ? resolveCategorySlug(data.slug, nextTitle)
          : existingTranslation?.slug || resolveCategorySlug(undefined, nextTitle);

      if (!nextSlug) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/bad-request",
          title: "Invalid slug",
          detail: "Category slug is required. Use Latin letters, numbers, and hyphens.",
        };
      }

      await this.assertSlugAvailable(nextSlug, locale, categoryId);

      if (categoryTranslations.length === 0) {
        await db.categoryTranslation.create({
          data: {
            categoryId: category.id,
            locale,
            title: nextTitle,
            slug: nextSlug,
            fullPath: nextSlug,
          },
        });
      } else {
        await db.categoryTranslation.updateMany({
          where: { categoryId: category.id },
          data: {
            title: nextTitle,
            slug: nextSlug,
            fullPath: nextSlug,
          },
        });
      }
    }

    // Update category base data
    const updatedCategory = await db.category.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        translations: true,
      },
    });

    const categoryTranslations = Array.isArray(updatedCategory.translations) ? updatedCategory.translations : [];
    const translation = categoryTranslations.find((t: { locale: string }) => t.locale === locale) || categoryTranslations[0] || null;
    await clearCategoriesCache();

    return {
      data: {
        id: updatedCategory.id,
        title: translation?.title || "",
        slug: translation?.slug || "",
        parentId: updatedCategory.parentId,
        requiresSizes: updatedCategory.requiresSizes || false,
        imageUrl: extractCategoryImageUrl(updatedCategory.media),
      },
    };
  }

  /**
   * Toggle category visibility on the home page strip (star control).
   */
  async toggleHomeStrip(categoryId: string) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { homeStripPosition: true },
    });

    if (!category) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Category not found",
        detail: `Category with id '${categoryId}' does not exist`,
      };
    }

    if (category.homeStripPosition !== null) {
      await db.category.update({
        where: { id: categoryId },
        data: { homeStripPosition: null },
      });
      await clearCategoriesCache();
      return { data: { showOnHomePage: false } };
    }

    await db.category.update({
      where: { id: categoryId },
      data: { homeStripPosition: 1 },
    });
    await clearCategoriesCache();

    return { data: { showOnHomePage: true } };
  }

  private async assertSlugAvailable(
    slug: string,
    locale: string,
    excludeCategoryId?: string,
  ): Promise<void> {
    const existing = await db.categoryTranslation.findFirst({
      where: {
        slug,
        locale,
        ...(excludeCategoryId
          ? { categoryId: { not: excludeCategoryId } }
          : {}),
        category: {
          deletedAt: null,
        },
      },
      select: { categoryId: true },
    });

    if (existing) {
      throw {
        status: 409,
        type: "https://api.shop.am/problems/conflict",
        title: "Slug already exists",
        detail: `Category slug '${slug}' is already used`,
      };
    }
  }

  /**
   * Helper function to check if a category is a descendant of another category
   */
  private async isCategoryDescendant(ancestorId: string, descendantId: string, visited: Set<string> = new Set()): Promise<boolean> {
    if (visited.has(descendantId)) {
      // Circular reference detected
      return false;
    }
    visited.add(descendantId);

    const category = await db.category.findUnique({
      where: { id: descendantId },
      include: {
        parent: true,
      },
    });

    if (!category || !category.parent) {
      return false;
    }

    if (category.parent.id === ancestorId) {
      return true;
    }

    return this.isCategoryDescendant(ancestorId, category.parent.id, visited);
  }

  /**
   * Reorder sibling categories (same parentId)
   */
  async reorderCategories(data: {
    parentId?: string | null;
    categoryIds: string[];
  }) {
    const parentId = data.parentId ?? null;

    if (!Array.isArray(data.categoryIds) || data.categoryIds.length === 0) {
      throw {
        status: 400,
        type: 'https://api.shop.am/problems/bad-request',
        title: 'Invalid reorder payload',
        detail: 'categoryIds must be a non-empty array',
      };
    }

    const uniqueIds = new Set(data.categoryIds);
    if (uniqueIds.size !== data.categoryIds.length) {
      throw {
        status: 400,
        type: 'https://api.shop.am/problems/bad-request',
        title: 'Invalid reorder payload',
        detail: 'categoryIds must not contain duplicates',
      };
    }

    if (parentId === null) {
      await this.normalizeOrphanCategoryParents();
    }

    const siblings = await db.category.findMany({
      where: {
        deletedAt: null,
        parentId,
      },
      select: { id: true },
      orderBy: { position: 'asc' },
    });

    const siblingIds = siblings.map((item) => item.id);
    if (siblingIds.length !== data.categoryIds.length) {
      throw {
        status: 400,
        type: 'https://api.shop.am/problems/bad-request',
        title: 'Invalid reorder payload',
        detail: 'categoryIds must include all sibling categories for the given parent',
      };
    }

    const siblingIdSet = new Set(siblingIds);
    const hasInvalidId = data.categoryIds.some((id) => !siblingIdSet.has(id));
    if (hasInvalidId) {
      throw {
        status: 400,
        type: 'https://api.shop.am/problems/bad-request',
        title: 'Invalid reorder payload',
        detail: 'One or more categoryIds do not belong to the specified parent',
      };
    }

    await db.$transaction(
      data.categoryIds.map((id, index) =>
        db.category.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    await clearCategoriesCache();

    return { success: true };
  }

  private async normalizeOrphanCategoryParents(): Promise<void> {
    const categories = await db.category.findMany({
      where: { deletedAt: null, parentId: { not: null } },
      select: { id: true, parentId: true },
    });

    const activeIds = new Set(categories.map((category) => category.id));
    const orphanIds = categories
      .filter((category) => category.parentId && !activeIds.has(category.parentId))
      .map((category) => category.id);

    if (orphanIds.length === 0) {
      return;
    }

    await db.category.updateMany({
      where: { id: { in: orphanIds } },
      data: { parentId: null },
    });
  }

  private async getNextSiblingPosition(parentId: string | null): Promise<number> {
    const result = await db.category.aggregate({
      where: {
        deletedAt: null,
        parentId,
      },
      _max: { position: true },
    });

    return (result._max.position ?? -1) + 1;
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(categoryId: string) {
    logger.info('🗑️ [ADMIN SERVICE] deleteCategory called:', { value: categoryId });
    
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        children: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    if (!category) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Category not found",
        detail: `Category with id '${categoryId}' does not exist`,
      };
    }

    // Check if category has children
    const childrenCount = category.children ? category.children.length : 0;
    if (childrenCount > 0) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Cannot delete category",
        detail: `This category has ${childrenCount} child categor${childrenCount > 1 ? 'ies' : 'y'}. Please delete or move child categories first.`,
        childrenCount,
      };
    }

    // Check if category has products (using count for better performance)
    const productsCount = await db.product.count({
      where: {
        OR: [
          { primaryCategoryId: categoryId },
          { categoryIds: { has: categoryId } },
        ],
        deletedAt: null,
      },
    });

    if (productsCount > 0) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Cannot delete category",
        detail: `This category has ${productsCount} associated product${productsCount > 1 ? 's' : ''}. Please remove products from this category first.`,
        productsCount,
      };
    }

    await db.category.update({
      where: { id: categoryId },
      data: {
        deletedAt: new Date(),
        published: false,
      },
    });
    await clearCategoriesCache();

    logger.info('✅ [ADMIN SERVICE] Category deleted:', { value: categoryId });
    return { success: true };
  }
}

export const adminCategoriesService = new AdminCategoriesService();



