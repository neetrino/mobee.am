import type { AdminLocaleTextMap } from "@/lib/admin/admin-content-locale";

export interface VariantJsonAttributeDefinition {
  key: string;
  names: AdminLocaleTextMap;
  /** Canonical value → localized labels; values not listed use the value in every locale. */
  valueLabels?: Record<string, AdminLocaleTextMap>;
  normalizeValue?: (raw: string) => string;
}

const MEMORY_SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(GB|TB)(?:\s*RAM)?$/i;

/** "8 GB RAM" / "8gb" → "8GB" (same shape as the `storage` attribute values). */
function normalizeMemorySize(raw: string): string {
  const match = raw.trim().match(MEMORY_SIZE_PATTERN);
  return match ? `${match[1]}${match[2].toUpperCase()}` : raw.trim();
}

/** Product-facing JSONB variant keys that must become real Attribute rows. */
export const VARIANT_JSON_ATTRIBUTE_DEFINITIONS: readonly VariantJsonAttributeDefinition[] = [
  {
    key: "ram",
    names: { hy: "Օպերատիվ հիշողություն", en: "RAM", ru: "Оперативная память" },
    normalizeValue: normalizeMemorySize,
  },
  { key: "processor", names: { hy: "Պրոցեսոր", en: "Processor", ru: "Процессор" } },
  { key: "chip", names: { hy: "Չիպ", en: "Chip", ru: "Чип" } },
  {
    key: "glass",
    names: { hy: "Էկրանի ապակի", en: "Display glass", ru: "Стекло дисплея" },
    valueLabels: {
      "Standard glass": { hy: "Ստանդարտ ապակի", en: "Standard glass", ru: "Стандартное стекло" },
      "Nano-texture glass": {
        hy: "Nano-texture ապակի",
        en: "Nano-texture glass",
        ru: "Стекло с нанотекстурой",
      },
    },
  },
  { key: "kit", names: { hy: "Լրակազմ", en: "Kit", ru: "Набор" } },
  { key: "hair_type", names: { hy: "Մազերի տեսակ", en: "Hair type", ru: "Тип волос" } },
  { key: "edition", names: { hy: "Տարբերակ", en: "Edition", ru: "Издание" } },
  { key: "bundle", names: { hy: "Փաթեթ", en: "Bundle", ru: "Комплект" } },
];

/** Canonical value for a raw JSONB string, or null when empty. */
export function canonicalAttributeValue(
  definition: VariantJsonAttributeDefinition,
  raw: unknown,
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return definition.normalizeValue ? definition.normalizeValue(trimmed) : trimmed;
}

/** Localized labels for a canonical value. */
export function attributeValueLabels(
  definition: VariantJsonAttributeDefinition,
  value: string,
): AdminLocaleTextMap {
  return definition.valueLabels?.[value] ?? { hy: value, en: value, ru: value };
}
