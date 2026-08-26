import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { getCachedProductList } from "@/lib/services/products-list-cached";

vi.mock("@/lib/services/products-list-cached", () => ({
  getCachedProductList: vi.fn(),
}));

vi.mock("@/lib/performance/product-list-http-cache", () => ({
  buildProductListCacheControlHeader: vi.fn(() => "public, max-age=0"),
}));

describe("GET /api/v1/products", () => {
  beforeEach(() => {
    vi.mocked(getCachedProductList).mockReset();
  });

  it("returns { data, meta } and cache headers for a valid empty result", async () => {
    vi.mocked(getCachedProductList).mockResolvedValue({
      cacheStatus: "MISS",
      result: {
        data: [],
        meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
      },
    });

    const req = new NextRequest("http://localhost:3000/api/v1/products?brand=apple&page=1&limit=12");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("MISS");
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
    expect(res.headers.get("Cache-Control")).toBeTruthy();
    expect(body).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
    });
    expect(vi.mocked(getCachedProductList).mock.calls[0]?.[0]).toMatchObject({
      brand: "apple",
      page: 1,
      limit: 12,
    });
  });

  it("keeps public query parameter names", async () => {
    vi.mocked(getCachedProductList).mockResolvedValue({
      cacheStatus: "HIT",
      result: {
        data: [{ id: "p1" }],
        meta: { total: 1, page: 2, limit: 12, totalPages: 1 },
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/v1/products?category=phones&search=a&colors=black&sizes=M&minPrice=10&maxPrice=99&sort=price-asc&lang=hy",
    );
    await GET(req);
    const filters = vi.mocked(getCachedProductList).mock.calls[0]?.[0];
    expect(filters).toMatchObject({
      category: "phones",
      search: "a",
      colors: "black",
      sizes: "M",
      minPrice: 10,
      maxPrice: 99,
      sort: "price-asc",
      lang: "hy",
    });
  });

  it("returns 400 problem+json for invalid numbers, negative price, reversed range, and unknown sort/filter", async () => {
    const cases = [
      "http://localhost:3000/api/v1/products?minPrice=-10&page=1abc&limit=12xyz",
      "http://localhost:3000/api/v1/products?minPrice=90&maxPrice=10",
      "http://localhost:3000/api/v1/products?sort=createdAt",
      "http://localhost:3000/api/v1/products?filter=clearance",
    ];
    for (const url of cases) {
      const res = await GET(new NextRequest(url));
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(res.headers.get("X-Request-ID")).toBeTruthy();
      expect(body.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.requestId).toBe(res.headers.get("X-Request-ID"));
      expect(body.type).toContain("api.mobee.am/problems");
      expect(getCachedProductList).not.toHaveBeenCalled();
      vi.mocked(getCachedProductList).mockClear();
    }
  });

  it("returns 5xx problem+json for a database outage without leaking internals", async () => {
    vi.mocked(getCachedProductList).mockRejectedValue(
      Object.assign(new Error("Can't reach database server at postgres://secret"), {
        name: "PrismaClientInitializationError",
      }),
    );
    const req = new NextRequest("http://localhost:3000/api/v1/products");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(JSON.stringify(body)).not.toContain("postgres://");
    expect(JSON.stringify(body)).not.toContain("Can't reach database server");
    expect(body.detail).toBe("The service is temporarily unavailable.");
    expect(body.code).toBe("DATABASE_UNAVAILABLE");
    expect(body.requestId).toBe(res.headers.get("X-Request-ID"));
  });

  it("returns problem+json for unexpected errors without leaking the message", async () => {
    vi.mocked(getCachedProductList).mockRejectedValue(new Error("boom"));
    const req = new NextRequest("http://localhost:3000/api/v1/products");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.status).toBe(500);
    expect(body.type).toContain("problems");
    expect(JSON.stringify(body)).not.toContain("boom");
  });

  it("echoes a safe incoming X-Request-ID and replaces an unsafe one", async () => {
    vi.mocked(getCachedProductList).mockResolvedValue({
      cacheStatus: "MISS",
      result: {
        data: [],
        meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
      },
    });

    const safeReq = new NextRequest("http://localhost:3000/api/v1/products", {
      headers: { "X-Request-ID": "req-safe-12345" },
    });
    const safeRes = await GET(safeReq);
    expect(safeRes.headers.get("X-Request-ID")).toBe("req-safe-12345");

    const unsafeReq = new NextRequest("http://localhost:3000/api/v1/products", {
      headers: { "X-Request-ID": "bad id with spaces and /slash" },
    });
    const unsafeRes = await GET(unsafeReq);
    expect(unsafeRes.headers.get("X-Request-ID")).not.toBe("bad id with spaces and /slash");
    expect(unsafeRes.headers.get("X-Request-ID")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
