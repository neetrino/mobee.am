import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { logger } from "../utils/logger";

/**
 * Deletes cart lines whose `variantId` or `productId` no longer exists in the DB.
 * Prevents Prisma from throwing "Field variant is required to return data, got null" on nested `include`.
 */
export async function removeOrphanCartItemsForUser(userId: string): Promise<void> {
  const deleted = await db.$executeRaw(
    Prisma.sql`
      DELETE FROM "cart_items" AS ci
      USING "carts" AS c
      WHERE ci."cartId" = c."id"
        AND c."userId" = ${userId}
        AND (
          NOT EXISTS (SELECT 1 FROM "product_variants" AS pv WHERE pv."id" = ci."variantId")
          OR NOT EXISTS (SELECT 1 FROM "products" AS p WHERE p."id" = ci."productId")
        )
    `,
  );
  if (deleted > 0) {
    logger.warn("Removed orphan cart items for user", { userId, deletedCount: deleted });
  }
}

/** Same as {@link removeOrphanCartItemsForUser} but scoped to a single cart row (e.g. checkout). */
export async function removeOrphanCartItemsForCart(cartId: string): Promise<void> {
  const deleted = await db.$executeRaw(
    Prisma.sql`
      DELETE FROM "cart_items" AS ci
      WHERE ci."cartId" = ${cartId}
        AND (
          NOT EXISTS (SELECT 1 FROM "product_variants" AS pv WHERE pv."id" = ci."variantId")
          OR NOT EXISTS (SELECT 1 FROM "products" AS p WHERE p."id" = ci."productId")
        )
    `,
  );
  if (deleted > 0) {
    logger.warn("Removed orphan cart items for cart", { cartId, deletedCount: deleted });
  }
}
