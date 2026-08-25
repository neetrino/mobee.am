import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/middleware/admin-context";
import { ERROR_CODES, problemType, titleForStatus } from "@/lib/errors/error-codes";
import { problemResponse } from "@/lib/errors/problem-response";
import { requestInstance, resolveRequestId } from "@/lib/errors/request-id";

/**
 * Returns trusted admin context or a 403 problem response for admin API routes.
 */
export async function requireAdminApiContext(
  request: NextRequest,
): Promise<import("@/lib/middleware/admin-context").AdminContext | NextResponse> {
  const context = await getAdminContext(request);
  if (!context) {
    return problemResponse(
      {
        type: problemType(ERROR_CODES.FORBIDDEN),
        title: titleForStatus(403),
        status: 403,
        detail: "Admin access required",
        code: ERROR_CODES.FORBIDDEN,
      },
      requestInstance(request),
      resolveRequestId(request),
    );
  }

  return context;
}
