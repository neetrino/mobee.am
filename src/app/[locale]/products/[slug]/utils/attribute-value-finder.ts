/**
 * Find attribute value by multiple matching strategies
 * Tries by valueId first (most reliable), then by value, then by label
 */
export function findAttributeValue(
  attributeValues: unknown[] | undefined,
  valueId: string | undefined,
  value: string,
  label: string
): { imageUrl?: string | null; colors?: string[] | null } | null {
  if (!attributeValues) return null;

  let attrValue: { imageUrl?: string | null; colors?: string[] | null } | null = null;

  if (valueId) {
    // First try by valueId (most reliable)
    const found = (attributeValues as Array<{ id?: string; imageUrl?: string | null; colors?: string[] | null }>).find(
      (v) => v.id === valueId
    );
    if (found) {
      attrValue = {
        imageUrl: found.imageUrl ?? null,
        colors: found.colors ?? null,
      };
    }
  }

  if (!attrValue) {
    // Fallback: try by value (case-insensitive)
    const found = (attributeValues as Array<{ value?: string; imageUrl?: string | null; colors?: string[] | null }>).find(
      (v) => v.value?.toLowerCase() === value?.toLowerCase() || v.value === value
    );
    if (found) {
      attrValue = {
        imageUrl: found.imageUrl ?? null,
        colors: found.colors ?? null,
      };
    }
  }

  if (!attrValue) {
    // Last resort: try by label (case-insensitive)
    const found = (attributeValues as Array<{ label?: string; imageUrl?: string | null; colors?: string[] | null }>).find(
      (v) => v.label?.toLowerCase() === label?.toLowerCase() || v.label === label
    );
    if (found) {
      attrValue = {
        imageUrl: found.imageUrl ?? null,
        colors: found.colors ?? null,
      };
    }
  }

  return attrValue;
}

