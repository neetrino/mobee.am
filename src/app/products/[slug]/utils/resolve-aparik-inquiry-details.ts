import { getAttributeLabel } from '../../../../lib/i18n';
import type { LanguageCode } from '../../../../lib/language';
import type { AttributeGroupValue, ProductVariant } from '../types';

const COLOR_ATTRIBUTE_KEYS = new Set(['color', 'colour']);

function resolveColorHex(group: AttributeGroupValue): string | undefined {
  if (group.colors && Array.isArray(group.colors) && group.colors.length > 0) {
    return group.colors[0] ?? undefined;
  }
  return undefined;
}

export function resolveSelectedColorForInquiry(
  selectedColor: string | null,
  attributeGroups: Map<string, AttributeGroupValue[]>,
  language: LanguageCode
): { color?: string; colorHex?: string } {
  if (!selectedColor?.trim()) {
    return {};
  }

  const normalized = selectedColor.toLowerCase().trim();
  const colorGroup = attributeGroups.get('color') ?? attributeGroups.get('colour');
  const match = colorGroup?.find((entry) => entry.value?.toLowerCase().trim() === normalized);

  return {
    color: getAttributeLabel(language, 'color', match?.value ?? selectedColor),
    colorHex: match ? resolveColorHex(match) : undefined,
  };
}

export function buildVariantTitleForInquiry(
  currentVariant: ProductVariant | null,
  selectedSize: string | null,
  language: LanguageCode
): string | undefined {
  if (currentVariant?.options?.length) {
    const parts = currentVariant.options
      .filter((option) => {
        const key = (option.key || option.attribute || '').toLowerCase();
        return key.length > 0 && !COLOR_ATTRIBUTE_KEYS.has(key);
      })
      .map((option) => {
        const key = option.key || option.attribute || '';
        return getAttributeLabel(language, key, option.value);
      })
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  if (selectedSize?.trim()) {
    return getAttributeLabel(language, 'size', selectedSize);
  }

  return undefined;
}
