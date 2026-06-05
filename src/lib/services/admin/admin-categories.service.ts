import { db } from "@white-shop/db";
import {
  buildCategoryMediaFromImageUrl,
  extractCategoryImageUrl,
} from "@/lib/categoryMedia";
import {
  HOME_CATEGORY_STRIP_MAX_POSITION,
  HOME_CATEGORY_STRIP_MIN_POSITION,
  normalizeHomeStripPosition,
} from "@/lib/constants/home-category-strip.constants";
import { getDefaultStripImageByPosition } from "@/lib/categoryStrip";
import { cacheService } from "@/lib/services/cache.service";
import { toSlug } from "@/lib/utils/slug";

async function clearCategoriesCache(): Promise<void> {
  await cacheService.deletePattern("categories:*");
}

function parseHomeStripPositionInput(value: unknown): number | null {
  const normalized = normalizeHomeStripPosition(value);
  if (value !== null && value !== undefined && value !== '' && normalized === null) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/bad-request",
      title: "Invalid home strip position",
      detail: `Home strip position must be between ${HOME_CATEGORY_STRIP_MIN_POSITION} and ${HOME_CATEGORY_STRIP_MAX_POSITION}, or empty`,
    };
  }
  return normalized;
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
      include: {
        translations: {
          where: { locale: "en" },
          take: 1,
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    return {
      data:       categories.map((category: {
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
        return {
          id: category.id,
          title: translation?.title || "",
          slug: translation?.slug || "",
          parentId: category.parentId,
          position: category.position,
          requiresSizes: category.requiresSizes || false,
          homeStripPosition: category.homeStripPosition,
          imageUrl: extractCategoryImageUrl(category.media),
        };
      }),
    };
  }

  /**
   * Create category
   */
  async createCategory(data: {
    title: string;
    locale?: string;
    parentId?: string;
    requiresSizes?: boolean;
    homeStripPosition?: number | null;
    imageUrl?: string | null;
  }) {
    const locale = data.locale || "en";
    
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
    
    // Generate slug from title (ReDoS-safe)
    const slug = toSlug(data.title);

    const homeStripPosition = parseHomeStripPositionInput(data.homeStripPosition);

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

    if (homeStripPosition !== null) {
      await this.assignHomeStripPosition(category.id, homeStripPosition);
    }

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
        homeStripPosition: refreshedCategory?.homeStripPosition ?? null,
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
          where: { locale: "en" },
          take: 1,
        },
        children: {
          include: {
            translations: {
              where: { locale: "en" },
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
      homeStripPosition: category.homeStripPosition,
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
    locale?: string;
    parentId?: string | null;
    requiresSizes?: boolean;
    subcategoryIds?: string[];
    homeStripPosition?: number | null;
    imageUrl?: string | null;
  }) {
    const locale = data.locale || "en";
    
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

    if (data.homeStripPosition !== undefined) {
      const homeStripPosition = parseHomeStripPositionInput(data.homeStripPosition);
      await this.assignHomeStripPosition(categoryId, homeStripPosition);
    }

    // Update translation if title is provided
    if (data.title) {
      const slug = toSlug(data.title);

      const categoryTranslations = Array.isArray(category.translations) ? category.translations : [];
      const existingTranslation = categoryTranslations.find((t: { locale: string }) => t.locale === locale);

      if (existingTranslation) {
        // Update existing translation
        await db.categoryTranslation.update({
          where: { id: existingTranslation.id },
          data: {
            title: data.title,
            slug,
          },
        });
      } else {
        // Create new translation
        await db.categoryTranslation.create({
          data: {
            categoryId: category.id,
            locale,
            title: data.title,
            slug,
            fullPath: slug,
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
        homeStripPosition: updatedCategory.homeStripPosition,
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
      await this.assignHomeStripPosition(categoryId, null);
      await clearCategoriesCache();
      return { data: { homeStripPosition: null } };
    }

    const nextPosition = await this.findNextHomeStripPosition();
    if (nextPosition === null) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Home strip full",
        detail: `All ${HOME_CATEGORY_STRIP_MAX_POSITION} home page slots are already assigned`,
      };
    }

    await this.assignHomeStripPosition(categoryId, nextPosition);
    await clearCategoriesCache();

    return { data: { homeStripPosition: nextPosition } };
  }

  /**
   * Assigns a unique home strip slot (1–6). Clears the slot from any other category first.
   */
  private async assignHomeStripPosition(
    categoryId: string,
    position: number | null,
  ): Promise<void> {
    if (position === null) {
      await db.category.update({
        where: { id: categoryId },
        data: { homeStripPosition: null },
      });
      return;
    }

    await db.category.updateMany({
      where: {
        homeStripPosition: position,
        id: { not: categoryId },
        deletedAt: null,
      },
      data: { homeStripPosition: null },
    });

    await db.category.update({
      where: { id: categoryId },
      data: { homeStripPosition: position },
    });

    await this.ensureDefaultStripImage(categoryId, position);
  }

  private async findNextHomeStripPosition(): Promise<number | null> {
    const used = await db.category.findMany({
      where: {
        deletedAt: null,
        homeStripPosition: { not: null },
      },
      select: { homeStripPosition: true },
    });

    const usedPositions = new Set(
      used
        .map((item) => item.homeStripPosition)
        .filter((value): value is number => value !== null),
    );

    for (
      let position = HOME_CATEGORY_STRIP_MIN_POSITION;
      position <= HOME_CATEGORY_STRIP_MAX_POSITION;
      position += 1
    ) {
      if (!usedPositions.has(position)) {
        return position;
      }
    }

    return null;
  }

  private async ensureDefaultStripImage(
    categoryId: string,
    position: number,
  ): Promise<void> {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { media: true },
    });

    if (!category || extractCategoryImageUrl(category.media)) {
      return;
    }

    await db.category.update({
      where: { id: categoryId },
      data: {
        media: [{ url: getDefaultStripImageByPosition(position) }],
      },
    });
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
    console.log('🗑️ [ADMIN SERVICE] deleteCategory called:', categoryId);
    
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

    console.log('✅ [ADMIN SERVICE] Category deleted:', categoryId);
    return { success: true };
  }
}

export const adminCategoriesService = new AdminCategoriesService();



