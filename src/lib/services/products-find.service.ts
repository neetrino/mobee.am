import { ProductFilters } from "./products-find-query.service";
import { findCatalogProductPage } from "@/lib/catalog/catalog-find";
import { productsFindTransformService } from "./products-find-transform.service";

class ProductsFindService {
  /**
   * Catalog list: DB filters, exact total, global sort, page-only relations.
   */
  async findAll(filters: ProductFilters) {
    const { products, total, query, discounts } = await findCatalogProductPage(filters);
    const data = await productsFindTransformService.transformProducts(
      products,
      query.lang,
      discounts,
      {
        colors: filters.colors,
        includeDescriptions: Boolean(query.ids?.length),
      },
    );

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: query.limit > 0 ? Math.ceil(total / query.limit) : 0,
      },
    };
  }
}

export const productsFindService = new ProductsFindService();
