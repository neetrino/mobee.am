/**
 * Card number formatter - formats card number with spaces every 4 digits
 * @param value - Raw card number input
 * @returns Formatted card number (e.g., "1234 5678 9012 3456")
 */
export function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\s/g, '');
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Card expiry date formatter - formats as MM/YY
 * @param value - Raw expiry date input
 * @returns Formatted expiry date (e.g., "12/25")
 */
export function formatCardExpiry(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
  }
  return cleaned;
}

/**
 * CVV formatter - removes non-numeric characters
 * @param value - Raw CVV input
 * @returns Numeric-only CVV
 */
export function formatCardCvv(value: string): string {
  return value.replace(/\D/g, '');
}




