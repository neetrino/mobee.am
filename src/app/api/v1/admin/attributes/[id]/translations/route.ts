import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";

/**
 * PATCH /api/v1/admin/attributes/[id]/translations
 * Update attribute translation (name)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: attributeId } = await params;
    const body = await req.json();

    console.log('✏️ [ADMIN ATTRIBUTE TRANSLATIONS] PATCH request:', { attributeId, body });

    const result = await adminService.updateAttributeTranslation(attributeId, {
      name: body.name,
      locale: body.locale || "en",
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    console.error("❌ [ADMIN ATTRIBUTE TRANSLATIONS] PATCH Error:", error);
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




