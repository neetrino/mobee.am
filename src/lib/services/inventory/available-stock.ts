/**
 * Unreserved on-hand quantity that a guest (or any non-reserved) buyer can take.
 * Atomic SQL remains the source of truth at checkout; this is for pre-checks and 422 copy.
 */
export function availableUnreservedStock(stock: number, stockReserved: number): number {
  const onHand = Number.isFinite(stock) ? stock : 0;
  const reserved = Number.isFinite(stockReserved) ? stockReserved : 0;
  return Math.max(0, onHand - Math.max(0, reserved));
}

export function hasUnreservedQuantity(
  stock: number,
  stockReserved: number,
  quantity: number,
): boolean {
  return availableUnreservedStock(stock, stockReserved) >= quantity;
}
