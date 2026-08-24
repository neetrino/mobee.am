export interface ResolveVariantSkuInput {
  databaseVariantId?: string;
  userSku: string;
  baseSlug: string;
  valueParts: string[];
  variantIndex: number;
  comboIndex: number;
}

/**
 * Resolves final SKU for a variant row.
 * Persisted variants keep SKU unchanged; new variants get generated or trimmed user input.
 */
export function resolveVariantSku(input: ResolveVariantSkuInput): string {
  const trimmedSku = input.userSku.trim();

  if (input.databaseVariantId) {
    return trimmedSku;
  }

  if (trimmedSku) {
    return trimmedSku;
  }

  const base = (input.baseSlug || "PROD").toUpperCase();
  const suffix =
    input.valueParts.length > 0 ? `-${input.valueParts.join("-")}` : "";
  return `${base}-${Date.now()}-${input.variantIndex + 1}-${input.comboIndex + 1}${suffix}`;
}

/**
 * Ensures SKU uniqueness within a batch by appending a counter suffix when needed.
 */
export function ensureUniqueSku(sku: string, usedSkus: Set<string>): string {
  let candidate = sku.trim();
  if (!candidate) {
    return candidate;
  }

  let counter = 1;
  while (usedSkus.has(candidate)) {
    candidate = `${sku.trim()}-${counter}`;
    counter += 1;
  }

  usedSkus.add(candidate);
  return candidate;
}
