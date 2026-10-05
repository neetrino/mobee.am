import {
  canonicalAttributeValue,
  type VariantJsonAttributeDefinition,
} from "./definitions";

export interface PlanVariantInput {
  id: string;
  productId: string;
  attributes: unknown;
  optionKeys: readonly string[];
}

export interface PlannedOption {
  key: string;
  value: string;
}

export interface PlannedVariant {
  variantId: string;
  productId: string;
  options: PlannedOption[];
  /** Full JSONB object with canonical values, or null when unchanged. */
  normalizedAttributes: Record<string, unknown> | null;
}

export interface BackfillPlan {
  valuesByKey: Map<string, Set<string>>;
  variants: PlannedVariant[];
}

function asJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function planVariant(
  variant: PlanVariantInput,
  definitions: readonly VariantJsonAttributeDefinition[],
  valuesByKey: Map<string, Set<string>>,
): PlannedVariant | null {
  const json = asJsonObject(variant.attributes);
  if (!json) return null;

  const existingKeys = new Set(variant.optionKeys.map((key) => key.toLowerCase()));
  const normalized: Record<string, unknown> = { ...json };
  const options: PlannedOption[] = [];
  let jsonChanged = false;

  for (const definition of definitions) {
    const value = canonicalAttributeValue(definition, json[definition.key]);
    if (!value) continue;
    if (value !== json[definition.key]) {
      normalized[definition.key] = value;
      jsonChanged = true;
    }
    if (existingKeys.has(definition.key)) continue;
    options.push({ key: definition.key, value });
    const values = valuesByKey.get(definition.key) ?? new Set<string>();
    values.add(value);
    valuesByKey.set(definition.key, values);
  }

  if (options.length === 0 && !jsonChanged) return null;
  return {
    variantId: variant.id,
    productId: variant.productId,
    options,
    normalizedAttributes: jsonChanged ? normalized : null,
  };
}

/**
 * Pure plan: which relational options each variant is missing and which JSONB values need canonicalizing.
 */
export function buildBackfillPlan(
  variants: readonly PlanVariantInput[],
  definitions: readonly VariantJsonAttributeDefinition[],
): BackfillPlan {
  const valuesByKey = new Map<string, Set<string>>();
  const planned: PlannedVariant[] = [];
  for (const variant of variants) {
    const item = planVariant(variant, definitions, valuesByKey);
    if (item) planned.push(item);
  }
  return { valuesByKey, variants: planned };
}
