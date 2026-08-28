import { db } from "@white-shop/db";

const READY_TTL_MS = 30_000;

let memo: { ready: boolean; checkedAt: number } | null = null;

/**
 * True when ProductListingRow projection has at least one row.
 * Fail-open to false when the Prisma delegate is missing (stale HMR client)
 * or the count query fails — PLP then uses the light-row catalog path.
 */
export async function isProductListingReadModelReady(): Promise<boolean> {
  if (memo && Date.now() - memo.checkedAt < READY_TTL_MS) {
    return memo.ready;
  }

  if (typeof db.productListingRow?.count !== "function") {
    memo = { ready: false, checkedAt: Date.now() };
    return false;
  }

  try {
    const count = await db.productListingRow.count();
    memo = { ready: count > 0, checkedAt: Date.now() };
    return memo.ready;
  } catch {
    memo = { ready: false, checkedAt: Date.now() };
    return false;
  }
}

export function markProductListingReadModelReady(): void {
  memo = { ready: true, checkedAt: Date.now() };
}

export function invalidateProductListingReadModelReadyMemo(): void {
  memo = null;
}
