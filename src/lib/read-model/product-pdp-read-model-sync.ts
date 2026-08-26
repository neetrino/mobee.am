import { db, Prisma } from "@white-shop/db";
import { transformProduct } from "@/lib/services/products-slug/product-transformer";
import type { ProductWithFullRelations } from "@/lib/services/products-slug/types";
import { PRODUCT_LISTING_READ_MODEL_DEFAULT_LOCALES } from "@/lib/read-model/product-read-model-locales";

const pdpInclude = {
  translations: true,
  brand: { include: { translations: true } },
  categories: { include: { translations: true } },
  variants: {
    where: { published: true },
    include: {
      options: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
              translations: true,
            },
          },
        },
      },
    },
  },
  labels: true,
  productAttributes: {
    include: {
      attribute: {
        include: {
          translations: true,
          values: { include: { translations: true } },
        },
      },
    },
  },
} as const;

async function loadProductForPdp(productId: string): Promise<ProductWithFullRelations | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: pdpInclude,
  });
  return product as ProductWithFullRelations | null;
}

export async function deleteProductPdpReadModel(productId: string): Promise<void> {
  await db.productPdpRow.deleteMany({ where: { productId } });
}

export async function syncProductPdpReadModel(
  productId: string,
  locales: readonly string[] = PRODUCT_LISTING_READ_MODEL_DEFAULT_LOCALES,
): Promise<void> {
  const product = await loadProductForPdp(productId);
  if (!product || product.deletedAt || !product.published) {
    await deleteProductPdpReadModel(productId);
    return;
  }

  const slugs = product.translations.map((row) => row.slug).filter(Boolean);
  const rebuiltAt = new Date();
  await db.productPdpRow.deleteMany({ where: { productId } });

  for (const locale of locales) {
    const translation =
      product.translations.find((row) => row.locale === locale) ?? product.translations[0];
    if (!translation?.slug) continue;
    const payload = await transformProduct(product, locale);
    await db.productPdpRow.create({
      data: {
        productId,
        locale,
        slug: translation.slug,
        slugs,
        payload: payload as Prisma.InputJsonValue,
        isPublished: true,
        productUpdatedAt: product.updatedAt,
        rebuiltAt,
      },
    });
  }
}

export async function syncProductPdpReadModelBatch(
  productIds: string[],
  locales: readonly string[] = PRODUCT_LISTING_READ_MODEL_DEFAULT_LOCALES,
): Promise<void> {
  for (const productId of productIds) {
    await syncProductPdpReadModel(productId, locales);
  }
}

export async function rebuildProductPdpReadModel(
  locales: readonly string[] = PRODUCT_LISTING_READ_MODEL_DEFAULT_LOCALES,
): Promise<void> {
  const products = await db.product.findMany({
    where: { published: true, deletedAt: null },
    select: { id: true },
  });
  await db.productPdpRow.deleteMany();
  const batchSize = 25;
  for (let index = 0; index < products.length; index += batchSize) {
    const chunk = products.slice(index, index + batchSize);
    await syncProductPdpReadModelBatch(
      chunk.map((product) => product.id),
      locales,
    );
  }
}
