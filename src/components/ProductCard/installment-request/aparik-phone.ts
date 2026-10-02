const PHONE_DIGITS_MIN = 8;
export const APARIK_PHONE_DIGITS_MAX = 15;

export function sanitizeAparikPhoneDigits(value: string): string {
  let digits = '';
  for (const char of value) {
    if (char >= '0' && char <= '9') {
      digits += char;
    }
  }
  return digits.slice(0, APARIK_PHONE_DIGITS_MAX);
}

export function isValidAparikPhoneDigits(phone: string): boolean {
  const trimmed = phone.trim();
  if (trimmed.length < PHONE_DIGITS_MIN || trimmed.length > APARIK_PHONE_DIGITS_MAX) {
    return false;
  }
  for (const char of trimmed) {
    if (char < '0' || char > '9') {
      return false;
    }
  }
  return true;
}
