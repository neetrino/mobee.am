import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";
import { invalidateHomeBrandsCache } from "@/lib/services/home-brands-cached";

/**
 * GET /api/v1/admin/brands
 * Get list of brands
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await getCachedAdminReferenceResponse("brands", () =>
      adminService.getBrands(),
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [ADMIN BRANDS] GET Error:", error);
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

/**
 * POST /api/v1/admin/brands
 * Create a new brand
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    console.log("📤 [ADMIN BRANDS] POST request:", body);

    const result = await adminService.createBrand(body);
    await invalidateAdminReferenceServerCache("brands");
    await invalidateHomeBrandsCache();

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("❌ [ADMIN BRANDS] POST Error:", error);
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

