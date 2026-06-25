import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/middleware/admin-context";

function buildForbiddenResponse(instance: string): NextResponse {
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/forbidden",
      title: "Forbidden",
      status: 403,
      detail: "Admin access required",
      instance,
    },
    { status: 403 },
  );
}

/**
 * Returns trusted admin context or a 403 response for admin API routes.
 */
export async function requireAdminApiContext(
  request: NextRequest,
): Promise<import("@/lib/middleware/admin-context").AdminContext | NextResponse> {
  const context = await getAdminContext(request);
  if (!context) {
    return buildForbiddenResponse(request.url);
  }

  return context;
}
