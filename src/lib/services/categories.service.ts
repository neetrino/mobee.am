import { db } from "@white-shop/db";
import { resolveLocalizedCategoryFields } from "../category-title-i18n";
import { pickCategoryTranslation } from "../pickCategoryTranslation";

class CategoriesService {
  /**
   * Get category tree
   */
  async getTree(lang: string = "en") {
    const categories = await db.category.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      include: {
        translations: true,
        children: {
          include: {
            translations: true,
          },
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: Array<{
      id: string;
      slug: string;
      title: string;
      fullPath: string;
      media: unknown;
      children: unknown[];
    }> = [];

    categories.forEach((category: {
      id: string;
      parentId: string | null;
      media: unknown;
      translations: Array<{ locale: string; slug: string; title: string; fullPath: string }>;
    }) => {
      const localized = resolveLocalizedCategoryFields(category.translations, lang);
      if (!localized) return;

      const categoryData = {
        id: category.id,
        slug: localized.slug,
        title: localized.title,
        fullPath: localized.fullPath,
        media: category.media ?? [],
        children: [] as unknown[],
      };

      categoryMap.set(category.id, categoryData);

      if (!category.parentId) {
        rootCategories.push(categoryData);
      }
    });

    // Build parent-child relationships
    categories.forEach((category: {
      id: string;
      parentId: string | null;
    }) => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        const child = categoryMap.get(category.id);
        if (parent && child) {
          parent.children.push(child);
        }
      }
    });

    return {
      data: rootCategories,
    };
  }

  /**
   * Get category by slug
   */
  async findBySlug(slug: string, lang: string = "en") {
    const category = await db.category.findFirst({
      where: {
        translations: {
          some: {
            slug,
          },
        },
        published: true,
        deletedAt: null,
      },
      include: {
        translations: true,
        parent: {
          include: {
            translations: true,
          },
        },
      },
    });

    if (!category) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Category not found",
        detail: `Category with slug '${slug}' does not exist or is not published`,
      };
    }

    const localized = resolveLocalizedCategoryFields(category.translations, lang);
    const parentLocalized = category.parent
      ? resolveLocalizedCategoryFields(category.parent.translations, lang)
      : null;
    const translation = pickCategoryTranslation(category.translations, lang);

    return {
      id: category.id,
      slug: localized?.slug || translation?.slug || "",
      title: localized?.title || translation?.title || "",
      description: translation?.description || null,
      fullPath: localized?.fullPath || translation?.fullPath || "",
      seo: {
        title: translation?.seoTitle || localized?.title || translation?.title,
        description: translation?.seoDescription || null,
      },
      parent: category.parent
        ? {
            id: category.parent.id,
            slug: parentLocalized?.slug || "",
            title: parentLocalized?.title || "",
          }
        : null,
    };
  }
}

export const categoriesService = new CategoriesService();
