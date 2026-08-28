import type { ProductVariant } from '../types';

export function pickSwatchFromVariantOptions(
  variants: ProductVariant[],
  valueId: string | undefined,
  value: string,
): { imageUrl: string | null; colors: string[] | null } {
  const normalizedValue = value.toLowerCase().trim();

  for (const variant of variants) {
    const option = variant.options?.find((opt) => {
      if (valueId && opt.valueId === valueId) return true;
      return opt.value?.toLowerCase().trim() === normalizedValue;
    });
    if (!option) continue;
    if (option.colors?.length || option.imageUrl) {
      return {
        imageUrl: option.imageUrl ?? null,
        colors: option.colors ?? null,
      };
    }
  }

  return { imageUrl: null, colors: null };
}
