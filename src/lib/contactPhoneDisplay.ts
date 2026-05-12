const NON_DIGITS = /\D/g;

/**
 * Splits a `contact.phone` i18n block into individual display lines (e.g. one number per line).
 */
export function splitContactPhoneDisplay(phoneBlock: string): readonly string[] {
  return phoneBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Builds a `tel:` URI from Armenian national (`0…`), `+374…`, or other digit-only international forms.
 */
export function phoneDisplayToTelHref(displayLine: string): string {
  const digits = displayLine.replace(NON_DIGITS, '');
  if (digits.length === 0) {
    return 'tel:';
  }
  if (digits.startsWith('374')) {
    return `tel:+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `tel:+374${digits.slice(1)}`;
  }
  return `tel:+${digits}`;
}
