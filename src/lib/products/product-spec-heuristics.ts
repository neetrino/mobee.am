import {
  PRODUCT_SPEC_ARMENIAN_LABEL_MAP,
  PRODUCT_SPEC_GENERIC_LABEL_MAP,
  PRODUCT_SPEC_OS_STATUS_VALUES,
  PRODUCT_SPEC_SECTION_HEADER_TITLES,
} from './product-spec-label-keys';
import { isCompatibleSpecPair } from './product-spec-semantic';

const ARMENIAN_LETTER = /[\u0531-\u0587]/;

/** Typical spec values: sizes, capacities, OS names, yes/no, model codes. */
const VALUE_PATTERNS: readonly RegExp[] = [
  /^\d+(\.\d+)?\s*(inch|inches|in)\b/i,
  /^\d+(\.\d+)?\s*(դյույմ|մմ|սմ)\b(\s*\([\d.]+\s*(մմ|սմ|mm|cm)\))?/i,
  /^\d+(\.\d+)?\s*(cm|mm|mAh|Wh|W|kg|g|lbs|oz|Hz|GHz|MHz|MP)\b/i,
  /^\d+\s*(GB|TB|MB|Kb|Kbps|Mbps|Gbps)\b/i,
  /^\d+\s*x\s*\d+/i,
  /^\d{4}$/,
  /^\d+\s*months?\b/i,
  /^(Այո|Ոչ|Yes|No|Да|Нет)$/i,
  /^(macOS|iOS|iPadOS|Windows|Android|Linux|HarmonyOS|Chrome\s*OS)$/i,
  /^(SSD|HDD|NVMe|eMMC|UFS)$/i,
  /^(Notebook|Laptop|Smartphone|Tablet|Desktop|Ultrabook|MacBook)$/i,
  /^\d+(\.\d+)?\s*inch\s*\([\d.]+\s*cm\)/i,
  /^[\d.]+\s*inch\b/i,
  /^[\d.]+\s*cm\b/i,
  /^[\d.]+\s*kg\b/i,
  /^[\d.]+\s*g\b/i,
  /^[\d.]+\s*mm\b/i,
  /^[\d.]+\s*W\b/i,
  /^[\d.]+\s*Wh\b/i,
  /^[\d.]+\s*mAh\b/i,
  /^[\d.]+\s*GHz\b/i,
  /^[\d.]+\s*MP\b/i,
  /^[\d.]+\s*MPix\b/i,
  /^[\d.]+\s*"/,
  /^[\d.]+\s*'$/,
];

const LABEL_ONLY_TOKENS = new Set([
  'bluetooth',
  'wifi',
  'wi-fi',
  'nfc',
  'gps',
  'usb',
  'hdmi',
]);

const VALUE_ONLY_TOKENS = new Set([
  'ios',
  'ipados',
  'android',
  'windows',
  'macos',
  'harmonyos',
  'linux',
  'ssd',
  'hdd',
  'nvme',
  'notebook',
  'laptop',
  'smartphone',
  'tablet',
  'desktop',
  'ultrabook',
  'այո',
  'ոչ',
  'yes',
  'no',
]);

export function resolveSpecLabelKey(text: string): string | undefined {
  const trimmed = text.trim();
  return PRODUCT_SPEC_ARMENIAN_LABEL_MAP.get(trimmed) ?? PRODUCT_SPEC_GENERIC_LABEL_MAP.get(trimmed);
}

export function isSectionOnlyLabel(text: string): boolean {
  return PRODUCT_SPEC_SECTION_HEADER_TITLES.has(text.trim());
}

/**
 * True when a label is a section group title incorrectly used as a spec row label.
 */
export function isSectionTitleAsSpecLabel(
  label: string,
  labelKey: string | undefined,
  value: string,
): boolean {
  if (!isSectionOnlyLabel(label)) {
    return false;
  }

  if (labelKey && value) {
    if (isCompatibleSpecPair(labelKey, value, { rawLabel: label })) {
      return false;
    }
  }

  return true;
}

/**
 * Values are usually numeric, unit-bearing, or short technical tokens without Armenian script.
 */
export function looksLikeSpecValue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (VALUE_ONLY_TOKENS.has(lower)) {
    return true;
  }
  if (LABEL_ONLY_TOKENS.has(lower)) {
    return false;
  }
  if (VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (ARMENIAN_LETTER.test(trimmed)) {
    return false;
  }

  if (/^[A-Z0-9][\w\s\-./+%(),]*$/i.test(trimmed) && trimmed.length <= 80) {
    return true;
  }

  return false;
}

/**
 * Labels are usually Armenian phrases or well-known connectivity/feature names.
 */
export function looksLikeSpecLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (resolveSpecLabelKey(trimmed)) {
    return true;
  }

  const lower = trimmed.toLowerCase();
  if (LABEL_ONLY_TOKENS.has(lower)) {
    return true;
  }
  if (VALUE_ONLY_TOKENS.has(lower)) {
    return false;
  }

  if (ARMENIAN_LETTER.test(trimmed)) {
    return true;
  }

  if (/^(model|type|color|weight|dimensions|processor|battery|warranty)$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Swap only when confidence is high: known label in value column, or value-like + label-like mismatch.
 */
export function shouldSwapSpecRow(label: string, value: string): boolean {
  const leftKey = resolveSpecLabelKey(label);
  const rightKey = resolveSpecLabelKey(value);

  if (leftKey && !rightKey) {
    return false;
  }
  if (!leftKey && rightKey) {
    return true;
  }
  if (leftKey && rightKey) {
    return false;
  }

  const leftIsValue = looksLikeSpecValue(label);
  const rightIsLabel = looksLikeSpecLabel(value);
  const leftIsLabel = looksLikeSpecLabel(label);
  const rightIsValue = looksLikeSpecValue(value);

  if (leftIsValue && rightIsLabel && !leftIsLabel && !rightIsValue) {
    return true;
  }
  if (leftIsValue && rightIsLabel) {
    return true;
  }

  return false;
}

export function isOsStatusToken(text: string): boolean {
  return PRODUCT_SPEC_OS_STATUS_VALUES.has(text.trim().toLowerCase());
}
