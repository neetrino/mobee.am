const REQUEST_ID_HEADER = "x-request-id";
const MIN_REQUEST_ID_LENGTH = 8;
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9._-]+$/;

export { REQUEST_ID_HEADER };

export type HeaderGetter = {
  get(name: string): string | null;
};

export function isSafeIncomingRequestId(value: string): boolean {
  if (value.length < MIN_REQUEST_ID_LENGTH || value.length > MAX_REQUEST_ID_LENGTH) {
    return false;
  }
  if (value.includes("\n") || value.includes("\r") || value.includes("\0")) {
    return false;
  }
  return SAFE_REQUEST_ID_RE.test(value);
}

/**
 * Accepts a client X-Request-ID only when it is short and injection-safe.
 * Otherwise generates a new UUID.
 */
export function resolveRequestId(request: { headers: HeaderGetter }): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim() ?? "";
  if (incoming && isSafeIncomingRequestId(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}

export function bindRequestId(request: Request, requestId: string): Headers {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return headers;
}

export function requestInstance(request: { nextUrl?: { pathname: string }; url?: string }): string {
  if (request.nextUrl?.pathname) {
    return request.nextUrl.pathname;
  }
  if (!request.url) {
    return "/";
  }
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/";
  }
}
