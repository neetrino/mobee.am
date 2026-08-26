import { db } from "@white-shop/db";
import type { ProductPdpPayload } from "@/lib/services/products-slug/product-transformer";

/**
 * Cheap indexed PDP read. Payload is the same shape as transformProduct.
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
