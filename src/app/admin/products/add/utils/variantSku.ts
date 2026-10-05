import type { GeneratedVariant } from "../types";

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

/**
 * Builds a positional variant SKU: `{slug}-{position}` (e.g. `iphone-15-2`).
 * Returns an empty string while the slug is not known yet.
 */
export function buildVariantSku(slug: string, position: number): string {
  const base = slug.trim();
  return base ? `${base}-${position}` : "";
}

/**
 * Next free positional SKU for a newly added variant.
 */
export function nextVariantSku(slug: string, variants: GeneratedVariant[]): string {
  const taken = new Set(variants.map((variant) => variant.sku.trim()));
  let position = variants.length + 1;
  while (taken.has(buildVariantSku(slug, position))) {
    position++;
  }
  return buildVariantSku(slug, position);
}

function readAutoSkuPosition(sku: string, slug: string): number | null {
  const prefix = `${slug.trim()}-`;
  if (!slug.trim() || !sku.startsWith(prefix)) {
    return null;
  }
  const suffix = sku.slice(prefix.length);
  return /^\d+$/.test(suffix) ? Number(suffix) : null;
}

/**
 * Re-prefixes auto-generated SKUs (`{prevSlug}-{n}` or empty) with the new slug.
 * Manually edited SKUs are left untouched.
 */
export function resyncVariantSkus(
  variants: GeneratedVariant[],
  prevSlug: string,
  nextSlug: string
): GeneratedVariant[] {
  let changed = false;
  const updated = variants.map((variant, index) => {
    const sku = variant.sku.trim();
    const position = sku ? readAutoSkuPosition(sku, prevSlug) : index + 1;
    if (position === null) {
      return variant;
    }
    const nextSku = buildVariantSku(nextSlug, position);
    if (nextSku === variant.sku) {
      return variant;
    }
    changed = true;
    return { ...variant, sku: nextSku };
  });
  return changed ? updated : variants;
}
