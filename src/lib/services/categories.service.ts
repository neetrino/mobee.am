import { db } from "@white-shop/db";
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
    const rootCategories: any[] = [];

    categories.forEach((category: {
      id: string;
      parentId: string | null;
      media: unknown;
      translations: Array<{ locale: string; slug: string; title: string; fullPath: string }>;
    }) => {
      const translation = pickCategoryTranslation(category.translations, lang);
      if (!translation) return;

      const categoryData = {
        id: category.id,
        slug: translation.slug,
        title: translation.title,
        fullPath: translation.fullPath,
        media: category.media ?? [],
        children: [] as any[],
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
            locale: lang,
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

    const translation = pickCategoryTranslation(category.translations, lang);
    const parentTranslation = category.parent
      ? pickCategoryTranslation(category.parent.translations, lang)
      : null;

    return {
      id: category.id,
      slug: translation?.slug || "",
      title: translation?.title || "",
      description: translation?.description || null,
      fullPath: translation?.fullPath || "",
      seo: {
        title: translation?.seoTitle || translation?.title,
        description: translation?.seoDescription || null,
      },
      parent: category.parent
        ? {
            id: category.parent.id,
            slug: parentTranslation?.slug || "",
            title: parentTranslation?.title || "",
          }
        : null,
    };
  }
}

export const categoriesService = new CategoriesService();

