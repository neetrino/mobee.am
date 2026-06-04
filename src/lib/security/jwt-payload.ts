import type { JWTPayload } from "jose";

export type AccessTokenPayload = JWTPayload & {
  userId?: string;
  roles?: string[];
};

/**
 * Middleware admin gate for JWTs that include `roles` (issued after security hardening).
 * - `legacy` — old tokens without roles; routes still enforce admin via DB.
 * - `allow` / `deny` — explicit decision from token claims.
 */
export function resolveAdminGateFromJwtPayload(
  payload: JWTPayload
): "allow" | "deny" | "legacy" {
  if (!Object.prototype.hasOwnProperty.call(payload, "roles")) {
    return "legacy";
  }

  const roles = (payload as AccessTokenPayload).roles;
  if (!Array.isArray(roles)) {
    return "deny";
  }

  return roles.includes("admin") ? "allow" : "deny";
}
