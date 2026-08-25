import { Prisma } from "@white-shop/db";
import { logger } from "@/lib/utils/logger";
import { lockVariantForUpdate } from "./stock-balance";

export interface ReservationChange {
  previousQuantity: number;
  nextQuantity: number;
}

export interface ReservationReleaseContext {
  requestId?: string | null;
}

export function calculateReservationDelta(change: ReservationChange): number {
  return change.nextQuantity - change.previousQuantity;
}

export async function reserveVariantStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantityDelta: number
): Promise<void> {
  if (quantityDelta <= 0) {
    return;
  }

  const updatedCount = await tx.$executeRaw(
    Prisma.sql`UPDATE "product_variants"
               SET "stockReserved" = "stockReserved" + ${quantityDelta}
               WHERE "id" = ${variantId}
                 AND "stock" - "stockReserved" >= ${quantityDelta}`
  );

  if (updatedCount === 0) {
    throw {
      status: 422,
      type: "https://api.shop.am/problems/validation-error",
      title: "Insufficient stock",
      detail: "Unable to reserve requested quantity",
    };
  }
}

function warnReservationOverRelease(input: {
  variantId: string;
  quantityDelta: number;
  previousReserved: number;
  nextReserved: number;
  context?: ReservationReleaseContext;
}): void {
  logger.warn("Stock reservation over-release clamped to zero", {
    requestId: input.context?.requestId ?? null,
    variantId: input.variantId,
    quantityDelta: input.quantityDelta,
    previousReserved: input.previousReserved,
    nextReserved: input.nextReserved,
  });
}

/**
 * Releases cart reservation. Over-release (`quantityDelta > stockReserved`) is
 * clamped to zero so ordinary cart-item deletion still succeeds when the
 * reserved balance is already short. The shortfall is detected under
 * `SELECT … FOR UPDATE` in the same transaction and logged; it is not thrown.
 */
export async function releaseVariantStockReservation(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantityDelta: number,
  context?: ReservationReleaseContext,
): Promise<void> {
  if (quantityDelta <= 0) {
    return;
  }

  const locked = await lockVariantForUpdate(tx, variantId);
  if (!locked) {
    return;
  }

  const nextReserved = Math.max(0, locked.stockReserved - quantityDelta);
  await tx.$executeRaw(
    Prisma.sql`UPDATE "product_variants"
               SET "stockReserved" = ${nextReserved}
               WHERE "id" = ${variantId}`,
  );

  if (quantityDelta > locked.stockReserved) {
    warnReservationOverRelease({
      variantId,
      quantityDelta,
      previousReserved: locked.stockReserved,
      nextReserved,
      context,
    });
  }
}
