import { Prisma } from "@white-shop/db";

export interface VariantStockRow {
  id: string;
  stock: number;
  stockReserved: number;
  sku: string | null;
}

export interface StockUpdateResult {
  stock: number;
  sku: string | null;
}

export async function lockVariantForUpdate(
  tx: Prisma.TransactionClient,
  variantId: string,
): Promise<VariantStockRow | null> {
  const rows = await tx.$queryRaw<VariantStockRow[]>(
    Prisma.sql`SELECT id, stock, "stockReserved", sku
               FROM "product_variants"
               WHERE id = ${variantId}
               FOR UPDATE`,
  );
  return rows[0] ?? null;
}

export async function decrementGuestOrderStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
): Promise<StockUpdateResult | null> {
  const rows = await tx.$queryRaw<StockUpdateResult[]>(
    Prisma.sql`UPDATE "product_variants"
               SET "stock" = "stock" - ${quantity}
               WHERE "id" = ${variantId}
                 AND "stock" >= ${quantity}
                 AND "stock" - "stockReserved" >= ${quantity}
               RETURNING "stock", "sku"`,
  );
  return rows[0] ?? null;
}

export async function decrementUserCartOrderStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
): Promise<StockUpdateResult | null> {
  const rows = await tx.$queryRaw<StockUpdateResult[]>(
    Prisma.sql`UPDATE "product_variants"
               SET "stock" = "stock" - ${quantity},
                   "stockReserved" = "stockReserved" - ${quantity}
               WHERE "id" = ${variantId}
                 AND "stock" >= ${quantity}
                 AND "stockReserved" >= ${quantity}
               RETURNING "stock", "sku"`,
  );
  return rows[0] ?? null;
}

export async function incrementOrderCancelStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
): Promise<StockUpdateResult | null> {
  const rows = await tx.$queryRaw<StockUpdateResult[]>(
    Prisma.sql`UPDATE "product_variants"
               SET "stock" = "stock" + ${quantity}
               WHERE "id" = ${variantId}
               RETURNING "stock", "sku"`,
  );
  return rows[0] ?? null;
}
