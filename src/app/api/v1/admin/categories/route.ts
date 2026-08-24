import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";

/**
 * GET /api/v1/admin/categories
 * Get list of categories
 */
export async function GET(req: NextRequest) {
  return withAdminPerfLog("/api/v1/admin/categories", async (markAuthComplete) => {
    try {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const result = await getCachedAdminReferenceResponse("categories", () =>
        adminService.getCategories(),
      );
      return NextResponse.json(result);
    } catch (error: unknown) {
      const err = error as { type?: string; title?: string; status?: number; detail?: string; message?: string };
      console.error("[ADMIN CATEGORIES] GET Error:", err.message ?? err.detail);
      return NextResponse.json(
        {
          type: err.type || "https://api.shop.am/problems/internal-error",
          title: err.title || "Internal Server Error",
          status: err.status || 500,
          detail: err.detail || err.message || "An error occurred",
          instance: req.url,
        },
        { status: err.status || 500 }
      );
    }
  });
}

/**
 * POST /api/v1/admin/categories
 * Create a new category
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    console.log("📤 [ADMIN CATEGORIES] POST request:", body);

    const result = await adminService.createCategory(body);
    await invalidateAdminReferenceServerCache("categories");

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("❌ [ADMIN CATEGORIES] POST Error:", error);
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

