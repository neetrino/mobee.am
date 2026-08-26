export const PROBLEM_TYPE_BASE = "https://api.mobee.am/problems";

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
  PROVIDER_FAILURE: "PROVIDER_FAILURE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const CODE_SLUGS: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "validation-error",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
  CONFLICT: "conflict",
  RATE_LIMITED: "too-many-requests",
  METHOD_NOT_ALLOWED: "method-not-allowed",
  DATABASE_UNAVAILABLE: "database-unavailable",
  PROVIDER_FAILURE: "provider-failure",
  SERVICE_UNAVAILABLE: "service-unavailable",
  INTERNAL_ERROR: "internal-error",
};

export const PUBLIC_DETAILS = {
  VALIDATION: "The request is invalid.",
  UNAUTHORIZED: "Authentication is required.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "The request conflicts with the current state.",
  RATE_LIMITED: "Too many requests. Try again later.",
  METHOD_NOT_ALLOWED: "The HTTP method is not allowed for this resource.",
  DATABASE: "The service is temporarily unavailable.",
  PROVIDER: "The upstream service is temporarily unavailable.",
  UNAVAILABLE: "The service is temporarily unavailable.",
  INTERNAL: "An unexpected error occurred.",
} as const;

export function problemType(code: ErrorCode): string {
  return `${PROBLEM_TYPE_BASE}/${CODE_SLUGS[code]}`;
}

export function titleForStatus(status: number): string {
  if (status === 400) return "Bad Request";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not Found";
  if (status === 409) return "Conflict";
  if (status === 405) return "Method Not Allowed";
  if (status === 429) return "Too Many Requests";
  if (status === 502) return "Bad Gateway";
  if (status === 503) return "Service Unavailable";
  return "Internal Server Error";
}

export function codeFromStatus(status: number): ErrorCode {
  if (status === 400) return ERROR_CODES.VALIDATION_ERROR;
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 409) return ERROR_CODES.CONFLICT;
  if (status === 405) return ERROR_CODES.METHOD_NOT_ALLOWED;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  if (status === 502) return ERROR_CODES.PROVIDER_FAILURE;
  if (status === 503) return ERROR_CODES.SERVICE_UNAVAILABLE;
  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Public 5xx detail is derived only from trusted status/code, never from raw messages.
 */
export function publicDetailForServerError(status: number, code: ErrorCode): string {
  if (code === ERROR_CODES.DATABASE_UNAVAILABLE) {
    return PUBLIC_DETAILS.DATABASE;
  }
  if (code === ERROR_CODES.PROVIDER_FAILURE || status === 502) {
    return PUBLIC_DETAILS.PROVIDER;
  }
  if (code === ERROR_CODES.SERVICE_UNAVAILABLE || status === 503) {
    return PUBLIC_DETAILS.UNAVAILABLE;
  }
  return PUBLIC_DETAILS.INTERNAL;
}
