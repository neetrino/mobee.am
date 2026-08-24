import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import type { AdminProductUpdateInput } from "@/lib/schemas/admin-product-update.schema";
import type { NormalizedProductUpdate, ProductUpdateResult } from "./types";
import {
  normalizeProductUpdate,
  hasProductUpdateWork,
  needsAttributeValueImageSync,
} from "./normalize-product-update";
import {
  collectVariantImages,
  buildProductUpdateData,
  updateProductTranslation,
  updateProductLabels,
  updateProductAttributes,
} from "./product-updater";
import { applyVariantOperations } from "./variant-updater";
import { updateAttributeValueImageUrls } from "./attribute-value-updater";

async function fetchProductUpdatedAt(productId: string): Promise<Date> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { updatedAt: true },
  });
  return product?.updatedAt ?? new Date();
}

async function fetchProductSlug(
  productId: string,
  locale: string
): Promise<string | undefined> {
  const translation = await db.productTranslation.findUnique({
    where: {
      productId_locale: {
        productId,
        locale,
      },
    },
    select: { slug: true },
  });
  return translation?.slug;
}

/**
 * Run atomic product update sections inside a transaction.
 */
async function runProductUpdateTransaction(
  productId: string,
  ops: NormalizedProductUpdate,
  existing: { publishedAt: Date | null }
): Promise<Date> {
  const updatedAt = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const needsMediaImages =
        ops.media?.replace !== undefined || ops.product !== undefined;
      const allVariantImages = needsMediaImages
        ? await collectVariantImages(ops.variants, productId, tx)
        : [];

      const updateData = buildProductUpdateData(ops, allVariantImages, existing);

      if (ops.basic) {
        await updateProductTranslation(productId, ops, tx);
      }

      if (ops.labels) {
        await updateProductLabels(productId, ops.labels, tx);
      }

      if (ops.attributes) {
        await updateProductAttributes(productId, ops.attributes, tx);
      }

      if (ops.variants) {
        await applyVariantOperations(
          ops.variants,
          productId,
          ops.locale || "en",
          tx
        );
      }

      const hasProductFields =
        updateData.brandId !== undefined ||
        updateData.primaryCategoryId !== undefined ||
        updateData.categoryIds !== undefined ||
        updateData.media !== undefined ||
        updateData.published !== undefined ||
        updateData.featured !== undefined;

      // Always touch product.updatedAt when any section ran.
      const product = await tx.product.update({
        where: { id: productId },
        data: hasProductFields
          ? updateData
          : { updatedAt: updateData.updatedAt ?? new Date() },
        select: { updatedAt: true },
      });

      return product.updatedAt;
    }
  );

  return updatedAt;
}

/**
 * Update product using normalized partial operations.
 * Image sync and cache revalidation happen outside the transaction.
 */
export async function updateProduct(
  productId: string,
  data: AdminProductUpdateInput
): Promise<ProductUpdateResult> {
  try {
    logger.info("Updating product", { productId });

    const existing = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    if (!existing) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Product not found",
        detail: `Product with id '${productId}' does not exist`,
      };
    }

    const ops = normalizeProductUpdate(data);

    if (!hasProductUpdateWork(ops)) {
      logger.info("Empty product update — skipping transaction", { productId });
      return {
        success: true,
        id: productId,
        updatedAt: existing.updatedAt,
        didUpdate: false,
        productSlug: await fetchProductSlug(productId, ops.locale || "en"),
      };
    }

    // Ensure table exists BEFORE transaction, only when attributes section present.
    if (ops.attributes) {
      const { ensureProductAttributesTable } = await import(
        "../../../utils/db-ensure"
      );
      await ensureProductAttributesTable();
    }

    const updatedAt = await runProductUpdateTransaction(
      productId,
      ops,
      existing
    );

    // Post-commit: conditional AttributeValue image sync (never fails the request).
    if (needsAttributeValueImageSync(ops)) {
      try {
        await updateAttributeValueImageUrls(productId);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn("Post-commit attribute image sync failed", {
          productId,
          error: errorMessage,
        });
      }
    }

    const productSlug =
      ops.basic?.slug ||
      (await fetchProductSlug(productId, ops.locale || "en"));

    return {
      success: true,
      id: productId,
      updatedAt,
      didUpdate: true,
      productSlug,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("updateProduct error", { error: errorMessage });
    throw error;
  }
}

/** Exported for tests — fetch current updatedAt without heavy includes. */
export { fetchProductUpdatedAt };
