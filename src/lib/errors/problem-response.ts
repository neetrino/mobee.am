import { NextResponse } from "next/server";
import type { MappedRouteError } from "./error.types";
import type { ProblemBody } from "./error.types";
import { REQUEST_ID_HEADER } from "./request-id";

export const PROBLEM_JSON = "application/problem+json";

export function buildProblemBody(
  mapped: MappedRouteError,
  instance: string,
  requestId: string,
): ProblemBody {
  const body: ProblemBody = {
    type: mapped.type,
    title: mapped.title,
    status: mapped.status,
    detail: mapped.detail,
    instance,
    code: mapped.code,
    requestId,
  };
  if (mapped.issues) {
    body.issues = mapped.issues;
  }
  return body;
}

export function problemResponse(
  mapped: MappedRouteError,
  instance: string,
  requestId: string,
): NextResponse {
  const body = buildProblemBody(mapped, instance, requestId);
  return NextResponse.json(body, {
    status: mapped.status,
    headers: {
      "Content-Type": PROBLEM_JSON,
      [REQUEST_ID_HEADER]: requestId,
      "Cache-Control": "no-store",
    },
  });
}

export function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

const PRESERVED_ERROR_HEADERS = [
  "allow",
  "retry-after",
  "www-authenticate",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-expose-headers",
] as const;

export function copyPreservedErrorHeaders(source: Headers, target: Headers): void {
  for (const name of PRESERVED_ERROR_HEADERS) {
    const value = source.get(name);
    if (value) {
      target.set(name, value);
    }
  }
  if (typeof source.getSetCookie === "function") {
    for (const cookie of source.getSetCookie()) {
      target.append("set-cookie", cookie);
    }
  }
}
