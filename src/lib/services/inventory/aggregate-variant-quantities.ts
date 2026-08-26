export interface VariantQuantityLine {
  variantId: string;
  quantity: number;
}

/**
 * Aggregates order/cart lines so each variant is decremented or restocked once.
 */
export function aggregateQuantitiesByVariantId(
  items: VariantQuantityLine[],
): VariantQuantityLine[] {
  const quantityByVariant = new Map<string, number>();

  for (const item of items) {
    const existingQuantity = quantityByVariant.get(item.variantId) ?? 0;
    quantityByVariant.set(item.variantId, existingQuantity + item.quantity);
  }

  return Array.from(quantityByVariant.entries()).map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}
