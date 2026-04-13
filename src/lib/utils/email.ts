const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;

/**
 * Validates email format using only string operations (no regex on user input)
 * to avoid ReDoS vulnerabilities.
 */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 3 || email.length > MAX_EMAIL_LENGTH) return false;

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex >= email.length - 1) return false;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (local.length > MAX_LOCAL_LENGTH || domain.length > MAX_DOMAIN_LENGTH)
    return false;
  if (!domain.includes(".")) return false;

  return true;
}
