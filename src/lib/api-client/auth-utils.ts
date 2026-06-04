const LEGACY_AUTH_TOKEN_KEY = "auth_token";
const LEGACY_AUTH_USER_KEY = "auth_user";

/**
 * Remove legacy localStorage JWT (pre–HttpOnly cookie migration).
 */
export function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_USER_KEY);
}

/** @deprecated Auth uses HttpOnly cookies; always returns null. */
export function getAuthToken(): string | null {
  return null;
}

export function isValidStoredAuthToken(token: string): boolean {
  const JWT_TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  return JWT_TOKEN_PATTERN.test(token.trim());
}

/**
 * Handle 401 Unauthorized errors - clear legacy storage and redirect
 */
export function handleUnauthorized(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearLegacyAuthStorage();
  window.dispatchEvent(new Event("auth-updated"));

  if (!window.location.pathname.includes("/login")) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = "/login?redirect=" + encodeURIComponent(currentPath);
  }
}
