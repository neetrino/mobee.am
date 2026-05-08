const HEX_6 = /^#([0-9A-Fa-f]{6})$/;
const HEX_3 = /^#([0-9A-Fa-f]{3})$/;

/**
 * Returns true if the string is a 3- or 6-digit CSS hex color.
 */
export function isValidHexColor(value: string): boolean {
  const trimmed = value.trim();
  return HEX_6.test(trimmed) || HEX_3.test(trimmed);
}

/**
 * Normalizes #rgb to #rrggbb; returns lowercase #rrggbb or original if invalid.
 */
export function normalizeHexToSixDigits(value: string): string {
  const trimmed = value.trim();
  if (HEX_6.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const m3 = trimmed.match(HEX_3);
  if (m3) {
    const [r, g, b] = m3[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed;
}

/**
 * Value safe for HTML `input[type="color"]` (6-digit hex only).
 */
export function hexForColorInput(value: string | null | undefined): string {
  if (!value || !isValidHexColor(value)) {
    return '#000000';
  }
  return normalizeHexToSixDigits(value);
}

const DEFAULT_PICKER_FALLBACK = '#94a3b8';

/**
 * Valid 6-digit hex for drag-based pickers when value is empty or invalid.
 */
export function safeHexForPicker(value: string | null | undefined, fallback = DEFAULT_PICKER_FALLBACK): string {
  if (!value || !isValidHexColor(value)) {
    return fallback;
  }
  return normalizeHexToSixDigits(value);
}

export function hexEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) {
    return false;
  }
  if (!isValidHexColor(a) || !isValidHexColor(b)) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return normalizeHexToSixDigits(a) === normalizeHexToSixDigits(b);
}
