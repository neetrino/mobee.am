import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminInventoryService } from "@/lib/services/admin/admin-inventory.service";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const searchParams = req.nextUrl.searchParams;
    const report = searchParams.get("report");
    if (report === "reconciliation") {
      const data = await adminInventoryService.getReconciliationReport();
      return NextResponse.json(data);
    }

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);
    const search = searchParams.get("search")?.trim() || undefined;
    const data = await adminInventoryService.getInventoryList({ page, limit, search });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const knownError = error as { status?: number; type?: string; title?: string; detail?: string; message?: string };
    return NextResponse.json(
      {
        type: knownError.type || "https://api.shop.am/problems/internal-error",
        title: knownError.title || "Internal Server Error",
        status: knownError.status || 500,
        detail: knownError.detail || knownError.message || "An error occurred",
        instance: req.url,
      },
      { status: knownError.status || 500 }
    );
  }
}
