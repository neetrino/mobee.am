export type AdminVariantAttributeItem = {
  valueId: string;
  value: string;
  attributeKey: string;
};

export type AdminVariantOption = {
  attributeKey: string | null;
  value: string | null;
  valueId: string | null;
  attributeValue?: {
    value: string;
    id: string;
    attribute: {
      key: string;
    };
  } | null;
};

function optionAttributeKey(option: AdminVariantOption): string {
  return option.attributeKey || option.attributeValue?.attribute?.key || "";
}

function optionValue(option: AdminVariantOption): string {
  return option.value || option.attributeValue?.value || "";
}

function optionValueId(option: AdminVariantOption): string {
  return option.valueId || option.attributeValue?.id || "";
}

/**
 * Relational ProductVariantOption is the source of truth for admin attributes.
 */
export function attributesMapFromOptions(
  options: AdminVariantOption[],
): Record<string, AdminVariantAttributeItem[]> {
  const attributesMap: Record<string, AdminVariantAttributeItem[]> = {};

  for (const option of options) {
    const attrKey = optionAttributeKey(option);
    const value = optionValue(option);
    const valueId = optionValueId(option);
    if (!attrKey || !value || !valueId) continue;
    if (!attributesMap[attrKey]) {
      attributesMap[attrKey] = [];
    }
    if (attributesMap[attrKey].some((item) => item.valueId === valueId)) continue;
    attributesMap[attrKey].push({ valueId, value, attributeKey: attrKey });
  }

  return attributesMap;
}

function jsonItemValue(item: unknown): string {
  if (item && typeof item === "object" && "value" in item) {
    return String((item as { value: unknown }).value);
  }
  return String(item);
}

/**
 * Parse JSONB color/size whether stored as a string or admin array.
 */
export function parseJsonbAttributeValues(raw: unknown, key: string): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const value = (raw as Record<string, unknown>)[key];
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value.map(jsonItemValue).filter(Boolean);
}

function isAdminAttributeItem(item: unknown): item is AdminVariantAttributeItem {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.valueId === "string" &&
    typeof record.value === "string" &&
    typeof record.attributeKey === "string"
  );
}

function overlayJsonbAttributeArrays(
  attributes: Record<string, AdminVariantAttributeItem[]>,
  jsonAttributes: unknown,
): Record<string, AdminVariantAttributeItem[]> {
  if (!jsonAttributes || typeof jsonAttributes !== "object" || Array.isArray(jsonAttributes)) {
    return attributes;
  }

  const merged = { ...attributes };
  for (const [key, value] of Object.entries(jsonAttributes as Record<string, unknown>)) {
    if (merged[key]?.length) continue;
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!value.every(isAdminAttributeItem)) continue;
    merged[key] = value;
  }
  return merged;
}

function firstOptionValue(options: AdminVariantOption[], key: string): string {
  const match = options.find((option) => optionAttributeKey(option) === key);
  return match ? optionValue(match) : "";
}

export function mergeAdminVariantAttributes(args: {
  options: AdminVariantOption[];
  jsonAttributes: unknown;
}): {
  attributes: Record<string, AdminVariantAttributeItem[]> | null;
  color: string;
  size: string;
  colorValues: string[];
  sizeValues: string[];
} {
  const fromOptions = attributesMapFromOptions(args.options);
  const attributes = overlayJsonbAttributeArrays(fromOptions, args.jsonAttributes);
  const jsonbColor = parseJsonbAttributeValues(args.jsonAttributes, "color");
  const jsonbSize = parseJsonbAttributeValues(args.jsonAttributes, "size");
  const colorValues = fromOptions.color?.map((item) => item.value) ?? jsonbColor;
  const sizeValues = fromOptions.size?.map((item) => item.value) ?? jsonbSize;
  const color = firstOptionValue(args.options, "color") || jsonbColor[0] || "";
  const size = firstOptionValue(args.options, "size") || jsonbSize[0] || "";

  return {
    attributes: Object.keys(attributes).length > 0 ? attributes : null,
    color,
    size,
    colorValues,
    sizeValues,
  };
}
