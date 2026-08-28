import { db } from "@white-shop/db";
import type { ProductPdpPayload } from "@/lib/services/products-slug/product-transformer";

/**
 * Stored PDP snapshot. Storefront reads live DB instead; this remains for rebuild/validate.
 */
export async function getProductPdpFromReadModel(
  slug: string,
  lang: string,
): Promise<ProductPdpPayload | null> {
  const row = await db.productPdpRow.findFirst({
    where: {
      locale: lang,
      isPublished: true,
      slugs: { has: slug },
    },
    select: { payload: true },
  });
  if (!row?.payload || typeof row.payload !== "object") {
    return null;
  }
  return row.payload as unknown as ProductPdpPayload;
}
