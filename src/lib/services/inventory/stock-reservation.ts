import { Prisma } from "@prisma/client";

export interface ReservationChange {
  previousQuantity: number;
  nextQuantity: number;
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

export async function releaseVariantStockReservation(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantityDelta: number
): Promise<void> {
  if (quantityDelta <= 0) {
    return;
  }

  await tx.$executeRaw(
    Prisma.sql`UPDATE "product_variants"
               SET "stockReserved" = GREATEST("stockReserved" - ${quantityDelta}, 0)
               WHERE "id" = ${variantId}`
  );
}
