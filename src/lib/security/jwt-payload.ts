import type { JWTPayload } from "jose";

export type AccessTokenPayload = JWTPayload & {
  userId?: string;
  roles?: string[];
};

/**
 * Middleware admin gate for JWTs that include `roles` (issued after security hardening).
 * Tokens without `roles` are denied — users must re-login to receive a hardened token.
 */
export function resolveAdminGateFromJwtPayload(
  payload: JWTPayload
): "allow" | "deny" {
  if (!Object.prototype.hasOwnProperty.call(payload, "roles")) {
    return "deny";
  }

  const roles = (payload as AccessTokenPayload).roles;
  if (!Array.isArray(roles)) {
    return "deny";
  }

  return roles.includes("admin") ? "allow" : "deny";
}
