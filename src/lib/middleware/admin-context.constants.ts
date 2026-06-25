/** Internal trusted admin context headers (set by middleware only). */
export const ADMIN_TRUSTED_HEADERS = {
  AUTHENTICATED: "x-mobee-admin-authenticated",
  USER_ID: "x-mobee-admin-user-id",
  ROLES: "x-mobee-admin-roles",
} as const;

export const ADMIN_TRUSTED_HEADER_VALUES = {
  AUTHENTICATED: "1",
} as const;

export function getTrustedAdminHeaderNames(): string[] {
  return Object.values(ADMIN_TRUSTED_HEADERS);
}
