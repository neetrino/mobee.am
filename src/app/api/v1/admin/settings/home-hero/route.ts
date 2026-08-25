import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { validateHomeHeroSettingsInput } from "@/lib/home-hero";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";

function problemResponse(
  req: NextRequest,
  status: number,
  title: string,
  detail: string,
  type = "https://api.shop.am/problems/validation-error",
) {
  return NextResponse.json(
    {
      type,
      title,
      status,
      detail,
      instance: req.url,
    },
    { status },
  );
}

/**
 * GET /api/v1/admin/settings/home-hero
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await getCachedAdminReferenceResponse("home-hero", () =>
      adminService.getHomeHeroSettings(),
    );
    return NextResponse.json(result);
  });
}

/**
 * PUT /api/v1/admin/settings/home-hero
 */
export async function PUT(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body: unknown = await req.json();
    const validated = validateHomeHeroSettingsInput(body);
    if (!validated.success) {
      return problemResponse(req, 400, "Validation Error", validated.detail);
    }

    const result = await adminService.updateHomeHeroSettings(validated.data);
    await invalidateAdminReferenceServerCache("home-hero");
    revalidatePath("/");

    return NextResponse.json(result);
  });
}
