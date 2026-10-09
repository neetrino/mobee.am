import { Prisma } from "@white-shop/db";
import type { VariantsUpdateOps } from "./types";

function requestsMainVariant(variants: VariantsUpdateOps): boolean {
  const inputs = [
    ...(variants.create ?? []),
    ...(variants.update ?? []),
    ...(variants.legacyReplace ?? []),
  ];
  return inputs.some((variant) => variant.isMain === true);
}

/**
 * Clears the current main variant before a new one is assigned, so the
 * one-main-per-product unique index is not violated mid-transaction.
 */
export async function clearMainVariantIfReassigned(
  variants: VariantsUpdateOps,
  productId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  if (!requestsMainVariant(variants)) {
    return;
  }
  await tx.productVariant.updateMany({
    where: { productId, isMain: true },
    data: { isMain: false },
  });
}
