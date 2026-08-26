import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/cache.service", () => ({
  cacheService: {
    get: vi.fn(),
    setex: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/services/products.service", () => ({
  productsService: {
    findAll: vi.fn(),
  },
}));

import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";
import { getCachedProductList } from "./products-list-cached";

describe("getCachedProductList", () => {
  beforeEach(() => {
    vi.mocked(cacheService.get).mockReset();
    vi.mocked(cacheService.setex).mockReset();
    vi.mocked(productsService.findAll).mockReset();
  });

  it("does not cache or empty-out a database failure", async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(productsService.findAll).mockRejectedValue(
      Object.assign(new Error("Can't reach database server at postgres://secret"), {
        name: "PrismaClientInitializationError",
      }),
    );

    await expect(getCachedProductList({ lang: "en", page: 1, limit: 12 })).rejects.toThrow(
      /Can't reach database server/,
    );
    expect(cacheService.setex).not.toHaveBeenCalled();
  });

  it("returns a cache HIT payload", async () => {
    const payload = {
      data: [{ id: "p1" }],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    };
    vi.mocked(cacheService.get).mockResolvedValue(JSON.stringify(payload));
    const out = await getCachedProductList({ lang: "en", page: 1, limit: 12 });
    expect(out.cacheStatus).toBe("HIT");
    expect(out.result).toEqual(payload);
    expect(productsService.findAll).not.toHaveBeenCalled();
  });

  it("falls back to the database when cache read fails", async () => {
    const payload = {
      data: [],
      meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
    };
    vi.mocked(cacheService.get).mockRejectedValue(new Error("redis down"));
    vi.mocked(productsService.findAll).mockResolvedValue(payload as never);
    const out = await getCachedProductList({ lang: "en", page: 1, limit: 12 });
    expect(out.cacheStatus).toBe("MISS");
    expect(out.result).toEqual(payload);
  });

  it("still returns the database result when cache write fails", async () => {
    const payload = {
      data: [{ id: "p2" }],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    };
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(cacheService.setex).mockRejectedValue(new Error("redis write failed"));
    vi.mocked(productsService.findAll).mockResolvedValue(payload as never);
    const out = await getCachedProductList({ lang: "en", page: 1, limit: 12 });
    expect(out.result).toEqual(payload);
    expect(out.cacheStatus).toBe("MISS");
  });
});
