import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminInventoryService } from "@/lib/services/admin/admin-inventory.service";

vi.mock("@/lib/middleware/admin-api-auth", () => ({
  requireAdminApiContext: vi.fn(),
}));

vi.mock("@/lib/services/admin/admin-inventory.service", () => ({
  adminInventoryService: {
    getInventoryList: vi.fn(),
    getReconciliationReport: vi.fn(),
  },
}));

describe("GET /api/v1/admin/inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminApiContext).mockResolvedValue({
      userId: "admin-1",
      roles: ["admin"],
      source: "fallback-auth",
    });
  });

  it("returns inventory list for admin", async () => {
    vi.mocked(adminInventoryService.getInventoryList).mockResolvedValue({
      data: [{ id: "v1" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    } as never);

    const req = new NextRequest("http://localhost:3000/api/v1/admin/inventory", {
      method: "GET",
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(adminInventoryService.getInventoryList).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
    });
    expect(body.meta.total).toBe(1);
  });

  it("returns reconciliation report when report query is set", async () => {
    vi.mocked(adminInventoryService.getReconciliationReport).mockResolvedValue({
      summary: { variantsCount: 10 },
      lowStock: [],
      movements: [],
    } as never);

    const req = new NextRequest(
      "http://localhost:3000/api/v1/admin/inventory?report=reconciliation",
      { method: "GET" }
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(adminInventoryService.getReconciliationReport).toHaveBeenCalledTimes(1);
    expect(body.summary.variantsCount).toBe(10);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(requireAdminApiContext).mockResolvedValue(
      NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
        },
        { status: 403 },
      ),
    );
    const req = new NextRequest("http://localhost:3000/api/v1/admin/inventory", {
      method: "GET",
    });
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
