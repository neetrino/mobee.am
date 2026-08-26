import { db } from "@white-shop/db";

const READY_TTL_MS = 30_000;

let memo: { ready: boolean; checkedAt: number } | null = null;

export async function isProductListingReadModelReady(): Promise<boolean> {
  if (memo && Date.now() - memo.checkedAt < READY_TTL_MS) {
    return memo.ready;
  }
  const count = await db.productListingRow.count();
  memo = { ready: count > 0, checkedAt: Date.now() };
  return memo.ready;
}

export function markProductListingReadModelReady(): void {
  memo = { ready: true, checkedAt: Date.now() };
}

export function invalidateProductListingReadModelReadyMemo(): void {
  memo = null;
}
