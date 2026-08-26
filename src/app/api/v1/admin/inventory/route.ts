import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminInventoryService } from "@/lib/services/admin/admin-inventory.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
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
  });
}
