import { getAuthToken } from "./auth-utils";
import type { RequestOptions } from "./types";

/**
 * Get headers with automatic token injection
 */
export function getHeaders(options?: RequestOptions): globalThis.HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  // Add auth token if available and not skipped
  if (!options?.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers as globalThis.HeadersInit;
}




