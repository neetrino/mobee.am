import type { RequestOptions } from "./types";

/**
 * Request headers for API calls. Auth is sent via HttpOnly cookie (`credentials: include`).
 */
export function getHeaders(options?: RequestOptions): globalThis.HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };

  return headers as globalThis.HeadersInit;
}




