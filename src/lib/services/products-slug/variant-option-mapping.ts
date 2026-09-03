import { resolveProductSwatchHexes } from "@/lib/product-color-hex.constants";
import type { ProductVariantWithOptions } from "./types";

export type VariantOptionResponse = {
  attribute: string;
  value: string;
  key: string;
  valueId?: string;
  attributeId?: string;
  imageUrl?: string | null;
  colors?: string[] | null;
};

const VARIANT_JSON_ATTRIBUTE_KEYS = [
  ["color", "color"],
  ["colour", "color"],
  ["storage", "storage"],
  ["memory", "storage"],
  ["size", "size"],
  ["ram", "ram"],
  ["gb_ram", "ram"],
  ["connectivity", "connectivity"],
  ["sim", "sim"],
] as const;

const TRAILING_PAREN_COLOR = /\(([^)]+)\)\s*$/;
const NOT_COLOR_PAREN = /^(?:\d+\s*(?:GB|TB)|4G|5G|LTE|eSIM|Wi-?Fi)$/i;
const REJECTED_COLOR_TOKENS = new Set([
  "eu",
  "us",
  "uk",
  "lte",
  "wifi",
  "dyson",
  "apple",
  "samsung",
  "google",
  "sony",
]);
const MODEL_OR_SKU = /^(?:[A-Z]{1,4}-)\d|[A-Z]{2}-\d|^[A-Z0-9-]{10,}$/i;

function isPlausibleCatalogColorName(value: string): boolean {
  if (!value || value.length > 48) return false;
  if (NOT_COLOR_PAREN.test(value)) return false;
  if (/^[A-Z]{2,3}$/.test(value)) return false;
  if (REJECTED_COLOR_TOKENS.has(value.toLowerCase().replace(/[\s_-]+/g, ""))) {
    return false;
  }
  if (MODEL_OR_SKU.test(value)) return false;
  return /[a-zA-Z]/.test(value);
}

export function extractColorFromTrailingParentheses(
  text: string | null | undefined,
): string | null {
  if (!text?.trim()) return null;
  const match = text.trim().match(TRAILING_PAREN_COLOR);
  if (!match) return null;
  const value = match[1].replace(/\s+/g, " ").trim();
  if (!isPlausibleCatalogColorName(value)) return null;
  return value;
}

function normalizeAttributeValueColors(colors: unknown): string[] | null {
  if (Array.isArray(colors)) {
    const parsed = colors.filter((item): item is string => typeof item === "string" && item.length > 0);
    return parsed.length > 0 ? parsed : null;
  }
  if (typeof colors === "string" && colors.trim()) {
    return [colors.trim()];
  }
  return null;
}

function readVariantAttributeString(
  attributes: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function recoverMissingColorFromVariant(variant: {
  media?: unknown;
  attributes?: unknown;
}): string | null {
  const media = Array.isArray(variant.media) ? variant.media : [];
  for (const item of media) {
    if (item && typeof item === "object" && "alt" in item) {
      const alt = (item as { alt?: unknown }).alt;
      const color = typeof alt === "string" ? extractColorFromTrailingParentheses(alt) : null;
      if (color) return color;
    }
  }
  return null;
}

function buildOptionsFromVariantAttributes(attributes: unknown): VariantOptionResponse[] {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return [];
  }

  const record = attributes as Record<string, unknown>;
  const options: VariantOptionResponse[] = [];

  for (const [sourceKey, targetKey] of VARIANT_JSON_ATTRIBUTE_KEYS) {
    const value = readVariantAttributeString(record, [sourceKey]);
    if (!value) continue;
    if (options.some((option) => option.key === targetKey)) continue;
    options.push({
      attribute: targetKey,
      value,
      key: targetKey,
    });
  }

  return options;
}

function mapRelationalOptions(
  variant: ProductVariantWithOptions,
): VariantOptionResponse[] {
  if (!Array.isArray(variant.options) || variant.options.length === 0) {
    return [];
  }

  return variant.options
    .map((opt: ProductVariantWithOptions["options"][number]) => {
      if (opt.attributeValue) {
        const attrValue = opt.attributeValue;
        const attr = attrValue.attribute;
        return {
          attribute: attr?.key || "",
          value: attrValue.value || "",
          key: attr?.key || "",
          valueId: attrValue.id,
          attributeId: attr?.id,
          imageUrl: attrValue.imageUrl || null,
          colors: normalizeAttributeValueColors(attrValue.colors),
        };
      }

      return {
        attribute: opt.attributeKey || "",
        value: opt.value || "",
        key: opt.attributeKey || "",
      };
    })
    .filter((option) => option.key && option.value);
}

function mergeOptionLists(
  primary: VariantOptionResponse[],
  fallback: VariantOptionResponse[],
): VariantOptionResponse[] {
  const merged = [...primary];
  for (const option of fallback) {
    if (!merged.some((existing) => existing.key === option.key)) {
      merged.push(option);
    }
  }
  return merged;
}

/**
 * Maps variant options for PDP. Relational ProductVariantOption is the source of
 * truth. JSONB fills missing keys. Media-alt recovery is last-resort evidence
 * until a backfill writes the relational option.
 */
export function mapVariantOptions(
  variant: ProductVariantWithOptions,
): VariantOptionResponse[] {
  const merged = mergeOptionLists(
    mapRelationalOptions(variant),
    buildOptionsFromVariantAttributes((variant as { attributes?: unknown }).attributes),
  );

  if (!merged.some((option) => option.key === "color")) {
    const recovered = recoverMissingColorFromVariant(variant);
    if (recovered) {
      merged.push({
        attribute: "color",
        value: recovered,
        key: "color",
      });
    }
  }

  return merged.map(withNamedColorHex);
}

function withNamedColorHex(option: VariantOptionResponse): VariantOptionResponse {
  if (option.key !== "color") return option;
  const hexes = resolveProductSwatchHexes({
    names: [option.value],
    stored: option.colors,
  });
  if (hexes.length === 0) return option;
  return { ...option, colors: hexes };
}
