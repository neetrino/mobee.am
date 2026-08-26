import { NextResponse } from "next/server";
import { mapRouteError } from "@/lib/errors/map-route-error";
import { problemResponse } from "@/lib/errors/problem-response";
import { requestInstance, resolveRequestId } from "@/lib/errors/request-id";
import { logger } from "@/lib/utils/logger";

/**
 * Safe problem+json for catalog HTTP routes. Prefer `runApiRoute` for new code.
 */
export function catalogProblemResponse(
  error: unknown,
  instance: string,
  logMessage: string,
): NextResponse {
  const mapped = mapRouteError(error);
  logger.error(logMessage, {
    errorCode: mapped.code,
    status: mapped.status,
    errorName: error instanceof Error ? error.name : undefined,
  });
  const requestId = crypto.randomUUID();
  let path = instance;
  try {
    path = instance.startsWith("http") ? new URL(instance).pathname : instance;
  } catch {
    path = instance;
  }
  return problemResponse(mapped, path || "/", requestId);
}

export function isCatalogDatabaseError(error: unknown): boolean {
  return mapRouteError(error).code === "DATABASE_UNAVAILABLE";
}

/** @deprecated Use requestId helpers instead. */
export function catalogRequestIdFromUrl(url: string): string {
  return requestInstance({ url });
}

export { resolveRequestId };
