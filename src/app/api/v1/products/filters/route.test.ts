import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { getCachedProductFilters } from "@/lib/services/products-filters-cached";

vi.mock("@/lib/services/products-filters-cached", () => ({
  getCachedProductFilters: vi.fn(),
}));

describe("GET /api/v1/products/filters", () => {
  beforeEach(() => {
    vi.mocked(getCachedProductFilters).mockReset();
  });

  it("returns facet payload with X-Cache", async () => {
    vi.mocked(getCachedProductFilters).mockResolvedValue({
      cacheStatus: "HIT",
      result: {
        colors: [],
        sizes: [],
        brands: [{ id: "b1", name: "Apple", count: 31 }],
        priceRange: {
          min: 10,
          max: 20,
          hasProducts: true,
          stepSize: null,
          stepSizePerCurrency: null,
        },
      },
    });

    const req = new NextRequest("http://localhost:3000/api/v1/products/filters?lang=en");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("HIT");
    expect(body.brands[0].count).toBe(31);
  });

  it("forwards filter into the facet cache input", async () => {
    vi.mocked(getCachedProductFilters).mockResolvedValue({
      cacheStatus: "MISS",
      result: {
        colors: [],
        sizes: [],
        brands: [],
        priceRange: {
          min: 0,
          max: 0,
          hasProducts: false,
          stepSize: null,
          stepSizePerCurrency: null,
        },
      },
    });
    const req = new NextRequest(
      "http://localhost:3000/api/v1/products/filters?filter=new&brand=apple&colors=black&lang=en",
    );
    await GET(req);
    expect(vi.mocked(getCachedProductFilters).mock.calls[0]?.[0]).toMatchObject({
      filter: "new",
      brand: "apple",
      colors: "black",
      lang: "en",
    });
  });

  it("returns 400 problem+json for unknown filter", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/products/filters?filter=clearance");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
    expect(body.requestId).toBe(res.headers.get("X-Request-ID"));
    expect(getCachedProductFilters).not.toHaveBeenCalled();
  });
});
