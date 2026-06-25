import type { NextRequest } from "next/server";
import {
  ADMIN_TRUSTED_HEADERS,
  ADMIN_TRUSTED_HEADER_VALUES,
} from "@/lib/middleware/admin-context.constants";
import { isAdminUserActive } from "@/lib/middleware/admin-validation-cache";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";

export type AdminContextSource = "trusted-header" | "fallback-auth";

export interface AdminContext {
  userId: string;
  roles: string[];
  source: AdminContextSource;
}

function parseRolesHeader(value: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
}

function hasAdminRole(roles: string[]): boolean {
  return roles.includes("admin");
}

/**
 * Reads trusted admin headers set by middleware after JWT verification.
 */
export function parseTrustedAdminHeaders(
  request: NextRequest | Request,
): { userId: string; roles: string[] } | null {
  const authenticated = request.headers.get(ADMIN_TRUSTED_HEADERS.AUTHENTICATED);
  const userId = request.headers.get(ADMIN_TRUSTED_HEADERS.USER_ID)?.trim();
  const roles = parseRolesHeader(request.headers.get(ADMIN_TRUSTED_HEADERS.ROLES));

  if (authenticated !== ADMIN_TRUSTED_HEADER_VALUES.AUTHENTICATED) {
    return null;
  }

  if (!userId || !hasAdminRole(roles)) {
    return null;
  }

  return { userId, roles };
}

/**
 * Resolves admin context from trusted middleware headers or fallback auth.
 */
export async function getAdminContext(
  request: NextRequest,
): Promise<AdminContext | null> {
  const trusted = parseTrustedAdminHeaders(request);
  if (trusted) {
    const active = await isAdminUserActive(trusted.userId);
    if (!active) {
      return null;
    }

    return {
      userId: trusted.userId,
      roles: trusted.roles,
      source: "trusted-header",
    };
  }

  const user = await authenticateToken(request);
  if (!user || !requireAdmin(user)) {
    return null;
  }

  return {
    userId: user.id,
    roles: user.roles,
    source: "fallback-auth",
  };
}
