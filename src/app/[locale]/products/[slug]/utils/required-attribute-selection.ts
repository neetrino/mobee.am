import type { AttributeGroupValue } from '../types';

const COLOR_KEYS = new Set(['color', 'colour']);

export function attributeGroupRequiresSelection(
  attrKey: string,
  groups: AttributeGroupValue[],
): boolean {
  const inStock = groups.filter((group) => group.stock > 0);
  if (inStock.length === 0) return false;

  if (COLOR_KEYS.has(attrKey)) {
    return inStock.length > 1;
  }

  if (attrKey === 'size') {
    return inStock.length > 1;
  }

  return inStock.length > 1;
}

export function isAttributeSelected(
  attrKey: string,
  selectedColor: string | null,
  selectedSize: string | null,
  selectedAttributeValues: Map<string, string>,
): boolean {
  if (COLOR_KEYS.has(attrKey)) {
    return Boolean(selectedColor);
  }

  if (attrKey === 'size') {
    return Boolean(selectedSize);
  }

  return selectedAttributeValues.has(attrKey);
}

export function getMissingRequiredAttributeKeys(
  attributeGroups: Map<string, AttributeGroupValue[]>,
  selectedColor: string | null,
  selectedSize: string | null,
  selectedAttributeValues: Map<string, string>,
): string[] {
  const missing: string[] = [];

  for (const [attrKey, groups] of attributeGroups.entries()) {
    if (!attributeGroupRequiresSelection(attrKey, groups)) continue;
    if (isAttributeSelected(attrKey, selectedColor, selectedSize, selectedAttributeValues)) {
      continue;
    }
    missing.push(attrKey);
  }

  return missing;
}

export function isAllRequiredAttributesSelected(
  attributeGroups: Map<string, AttributeGroupValue[]>,
  selectedColor: string | null,
  selectedSize: string | null,
  selectedAttributeValues: Map<string, string>,
): boolean {
  return getMissingRequiredAttributeKeys(
    attributeGroups,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
  ).length === 0;
}
