const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
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
  localStorage.removeItem('auth_user');
  
  // Trigger auth update event to notify AuthContext
  window.dispatchEvent(new Event('auth-updated'));
  
  // Redirect to login if not already there
  if (!window.location.pathname.includes('/login')) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
  }
}




