import { db } from "@white-shop/db";
import type { CategoryTreeNode } from "@/lib/category-nav";
import { resolveLocalizedCategoryFields } from "../category-title-i18n";
import { pickCategoryTranslation } from "../pickCategoryTranslation";

export type CategoriesTreeResult = {
  data: CategoryTreeNode[];
};

class CategoriesService {
  /**
   * Get category tree
   */
  async getTree(lang: string = "en"): Promise<CategoriesTreeResult> {
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

    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootCategories: CategoryTreeNode[] = [];

    categories.forEach((category: {
      id: string;
      parentId: string | null;
      media: unknown;
      translations: Array<{ locale: string; slug: string; title: string; fullPath: string }>;
    }) => {
      const localized = resolveLocalizedCategoryFields(category.translations, lang);
      if (!localized) return;

      const categoryData: CategoryTreeNode = {
        id: category.id,
        slug: localized.slug,
        title: localized.title,
        fullPath: localized.fullPath,
        media: category.media ?? [],
        children: [],
      };

      categoryMap.set(category.id, categoryData);

      if (!category.parentId) {
        rootCategories.push(categoryData);
      }
    });

    categories.forEach((category: {
      id: string;
      parentId: string | null;
    }) => {
      if (!category.parentId) {
        return;
      }
      const parent = categoryMap.get(category.parentId);
      const child = categoryMap.get(category.id);
      if (parent && child) {
        parent.children.push(child);
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
