import { db } from "@white-shop/db";
import type { RelatedCategorySource } from "./products-related.service";

function buildSlugWhere(slug: string, lang: string) {
  return {
    translations: {
      some: {
        slug,
        locale: lang,
      },
    },
    published: true,
    deletedAt: null,
  };
}

async function findRelatedContextRow(slug: string, lang: string) {
  return db.product.findFirst({
    where: buildSlugWhere(slug, lang),
    select: {
      id: true,
      primaryCategoryId: true,
      categoryIds: true,
      categories: { select: { id: true } },
    },
  });
}

/**
 * Minimal slug lookup for related products — no variants/media/attributes graph.
 */
export async function findProductRelatedContextBySlug(
  slug: string,
  lang: string,
): Promise<RelatedCategorySource | null> {
  let row = await findRelatedContextRow(slug, lang);

  if (!row && lang !== "en") {
    row = await findRelatedContextRow(slug, "en");
  }

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    primaryCategoryId: row.primaryCategoryId,
    categoryIds: row.categoryIds,
    categories: row.categories,
  };
}
