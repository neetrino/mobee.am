const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const JWT_TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function isValidStoredAuthToken(token: string): boolean {
  return JWT_TOKEN_PATTERN.test(token.trim());
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)?.trim() ?? null;
    if (!token) {
      return null;
    }
    if (!isValidStoredAuthToken(token)) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Handle 401 Unauthorized errors - clear auth and redirect
 */
export function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  
  console.warn('⚠️ [API CLIENT] Unauthorized (401) - clearing auth data');
  localStorage.removeItem('auth_token');
  localStorage.removeItem(AUTH_USER_KEY);
  
  // Trigger auth update event to notify AuthContext
  window.dispatchEvent(new Event('auth-updated'));
  
  // Redirect to login if not already there
  if (!window.location.pathname.includes('/login')) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
  }
}




