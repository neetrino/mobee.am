import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { createCommerceContext } from "@/lib/services/orders/commerce-context";
import type { CommerceActorSource, CommerceRequestContext } from "@/lib/services/orders/order-transition.types";
import { mapRouteError } from "./map-route-error";
import { PROBLEM_JSON, copyPreservedErrorHeaders, problemResponse, withRequestId } from "./problem-response";
import { REQUEST_ID_HEADER, requestInstance, resolveRequestId } from "./request-id";

export type ApiRouteContext = {
  requestId: string;
  commerce: (input: {
    actorUserId?: string | null;
    source: CommerceActorSource;
    note?: string;
  }) => CommerceRequestContext;
};

const SENSITIVE_ROUTE_RE = /\/(auth|payments|checkout|password)(\/|$)/i;

function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_ROUTE_RE.test(pathname);
}

function asNextResponse(response: Response): NextResponse {
  if (response instanceof NextResponse) {
    return response;
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

function logCompletion(
  req: NextRequest,
  requestId: string,
  status: number,
  startedAt: number,
  errorCode?: string,
): void {
  logger.info("API request completed", {
    requestId,
    route: requestInstance(req),
    method: req.method,
    status,
    durationMs: Date.now() - startedAt,
    errorCode,
    sensitive: isSensitiveRoute(requestInstance(req)),
  });
}

async function finalizeErrorJson(
  response: NextResponse,
  requestId: string,
  instance: string,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return withRequestId(response, requestId);
  }

  if (!body || typeof body !== "object") {
    return withRequestId(response, requestId);
  }

  const record = body as Record<string, unknown>;
  const looksProblem =
    typeof record.status === "number" || "type" in record || "title" in record;
  if (!looksProblem) {
    return withRequestId(response, requestId);
  }

  const mapped = mapRouteError({
    ...record,
    status: typeof record.status === "number" ? record.status : response.status,
  });
  const next = problemResponse(mapped, instance, requestId);
  copyPreservedErrorHeaders(response.headers, next.headers);
  if (Array.isArray(record.issues) && !mapped.issues) {
    const bodyWithIssues = { ...mapped, instance, requestId, issues: record.issues };
    const withIssues = NextResponse.json(bodyWithIssues, {
      status: mapped.status,
      headers: {
        "Content-Type": PROBLEM_JSON,
        [REQUEST_ID_HEADER]: requestId,
        "Cache-Control": "no-store",
      },
    });
    copyPreservedErrorHeaders(response.headers, withIssues.headers);
    return withIssues;
  }
  return next;
}

/**
 * Runs an API handler with request ID, safe problem+json errors, and structured logs.
 */
export async function runApiRoute(
  req: NextRequest,
  handler: (ctx: ApiRouteContext) => Promise<Response>,
): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  const instance = requestInstance(req);
  const startedAt = Date.now();

  try {
    const raw = asNextResponse(
      await handler({
        requestId,
        commerce: (input) => createCommerceContext({ requestId, ...input }),
      }),
    );
    const response =
      raw.status >= 400
        ? await finalizeErrorJson(raw, requestId, instance)
        : withRequestId(raw, requestId);
    logCompletion(req, requestId, response.status, startedAt);
    return response;
  } catch (error: unknown) {
    const mapped = mapRouteError(error);
    if (mapped.status >= 500) {
      const isProduction = process.env.NODE_ENV === "production";
      logger.error(mapped.logMessage || "API route failed", {
        requestId,
        route: instance,
        method: req.method,
        status: mapped.status,
        errorCode: mapped.code,
        errorName: error instanceof Error ? error.name : undefined,
        ...(isProduction
          ? {}
          : { errorMessage: error instanceof Error ? error.message : String(error) }),
      });
    }
    const response = problemResponse(mapped, instance, requestId);
    logCompletion(req, requestId, mapped.status, startedAt, mapped.code);
    return response;
  }
}
