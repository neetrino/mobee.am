import { ZodError } from "zod";
import { CatalogQueryError } from "@/lib/catalog/catalog-query-error";
import { MissingEnvError } from "@/config/env-core";
import { isAppError, isApiError } from "./app-error";
import {
  codeFromStatus,
  ERROR_CODES,
  problemType,
  PUBLIC_DETAILS,
  publicDetailForServerError,
  titleForStatus,
} from "./error-codes";
import type { MappedRouteError } from "./error.types";
import { mapPrismaError } from "./map-prisma-error";

const PUBLIC_4XX_MIN = 400;

function isKnownErrorCode(value: string): value is MappedRouteError["code"] {
  return (Object.values(ERROR_CODES) as string[]).includes(value);
}

function zodIssues(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function publicZodDetail(error: ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  const detail = Object.entries(fieldErrors)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join("; ");
  return detail || PUBLIC_DETAILS.VALIDATION;
}

function mapExplicitApiError(error: {
  status?: number;
  type?: string;
  title?: string;
  detail?: string;
  code?: string;
}): MappedRouteError | null {
  const status = error.status;
  if (typeof status !== "number" || status < PUBLIC_4XX_MIN || status > 599) {
    return null;
  }
  const code =
    typeof error.code === "string" && isKnownErrorCode(error.code)
      ? error.code
      : codeFromStatus(status);
  const isServer = status >= 500;
  const detail = isServer
    ? publicDetailForServerError(status, code)
    : typeof error.detail === "string" && error.detail.trim()
      ? error.detail
      : PUBLIC_DETAILS.VALIDATION;
  const issues = Array.isArray((error as { issues?: unknown }).issues)
    ? (error as { issues: Array<{ path: string; message: string }> }).issues
    : undefined;
  return {
    type: problemType(code),
    title: error.title || titleForStatus(status),
    status,
    detail,
    code,
    issues,
    logMessage: isServer ? "Explicit API error" : undefined,
  };
}

/**
 * Converts any thrown value into a safe public problem payload.
 */
export function mapRouteError(error: unknown): MappedRouteError {
  if (error instanceof MissingEnvError) {
    return {
      type: problemType(ERROR_CODES.SERVICE_UNAVAILABLE),
      title: titleForStatus(503),
      status: 503,
      detail: PUBLIC_DETAILS.UNAVAILABLE,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      logMessage: "Missing production environment variables",
      logMeta: { missing: error.missing },
    };
  }

  if (isAppError(error)) {
    const detail =
      error.status >= 500
        ? publicDetailForServerError(error.status, error.code)
        : error.detail;
    return {
      type: error.type,
      title: error.title,
      status: error.status,
      detail,
      code: error.code,
    };
  }

  if (error instanceof CatalogQueryError) {
    return {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      code: ERROR_CODES.VALIDATION_ERROR,
    };
  }

  if (error instanceof ZodError) {
    return {
      type: problemType(ERROR_CODES.VALIDATION_ERROR),
      title: "Validation Error",
      status: 400,
      detail: publicZodDetail(error),
      code: ERROR_CODES.VALIDATION_ERROR,
      issues: zodIssues(error),
    };
  }

  const prismaMapped = mapPrismaError(error);
  if (prismaMapped) {
    return prismaMapped;
  }

  if (isApiError(error)) {
    const mapped = mapExplicitApiError(error);
    if (mapped) {
      return mapped;
    }
  }

  return {
    type: problemType(ERROR_CODES.INTERNAL_ERROR),
    title: titleForStatus(500),
    status: 500,
    detail: PUBLIC_DETAILS.INTERNAL,
    code: ERROR_CODES.INTERNAL_ERROR,
    logMessage: "Unknown internal error",
  };
}

/**
 * Legacy helper used by remaining call sites. Never includes raw Error.message for 5xx.
 */
export function toApiError(
  error: unknown,
  instance?: string,
): MappedRouteError & { instance?: string } {
  return { ...mapRouteError(error), instance };
}
