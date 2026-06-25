import {
  ADMIN_TRUSTED_HEADERS,
  ADMIN_TRUSTED_HEADER_VALUES,
  getTrustedAdminHeaderNames,
} from "@/lib/middleware/admin-context.constants";

/**
 * Removes spoofable trusted admin headers from incoming requests.
 */
export function stripTrustedAdminHeaders(headers: Headers): Headers {
  const cleaned = new Headers(headers);
  for (const headerName of getTrustedAdminHeaderNames()) {
    cleaned.delete(headerName);
  }
  return cleaned;
}

/**
 * Sets trusted admin headers after middleware JWT verification.
 */
export function setTrustedAdminHeaders(
  headers: Headers,
  payload: { userId: string; roles: string[] },
): void {
  headers.set(ADMIN_TRUSTED_HEADERS.AUTHENTICATED, ADMIN_TRUSTED_HEADER_VALUES.AUTHENTICATED);
  headers.set(ADMIN_TRUSTED_HEADERS.USER_ID, payload.userId);
  headers.set(ADMIN_TRUSTED_HEADERS.ROLES, payload.roles.join(","));
}
