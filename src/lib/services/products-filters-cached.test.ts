import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/cache.service", () => ({
  cacheService: {
    get: vi.fn(),
    setex: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/services/products.service", () => ({
  productsService: {
    getFilters: vi.fn(),
  },
}));

import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";
import { buildProductFiltersCacheKey, getCachedProductFilters } from "./products-filters-cached";

describe("buildProductFiltersCacheKey", () => {
  it("is stable for same logical filters", () => {
    const a = buildProductFiltersCacheKey({
      lang: "en",
      category: "phones",
      minPrice: 10,
      maxPrice: 99,
    });
    const b = buildProductFiltersCacheKey({
      maxPrice: 99,
      minPrice: 10,
      category: "phones",
      lang: "en",
    });
    expect(a).toBe(b);
    expect(a.startsWith("products:filters:")).toBe(true);
  });

  it("normalizes multi-category param order for cache key", () => {
    const a = buildProductFiltersCacheKey({ lang: "en", category: "b,a" });
    const b = buildProductFiltersCacheKey({ lang: "en", category: "a,b" });
    expect(a).toBe(b);
  });
});

describe("getCachedProductFilters", () => {
  beforeEach(() => {
    vi.mocked(cacheService.get).mockReset();
    vi.mocked(productsService.getFilters).mockReset();
  });

  it("returns cached payload on HIT", async () => {
    const payload = {
      colors: [],
      sizes: [],
      brands: [],
      priceRange: { min: 0, max: 100, stepSize: null, stepSizePerCurrency: null },
    };
    vi.mocked(cacheService.get).mockResolvedValue(JSON.stringify(payload));

    const out = await getCachedProductFilters({ lang: "hy" });
    expect(out.cacheStatus).toBe("HIT");
    expect(out.result).toEqual(payload);
    expect(productsService.getFilters).not.toHaveBeenCalled();
  });

  it("calls getFilters on MISS and stores result", async () => {
    const payload = {
      colors: [{ value: "black", label: "Black", count: 2 }],
      sizes: [],
      brands: [],
      priceRange: { min: 0, max: 5000, stepSize: 100, stepSizePerCurrency: null },
    };
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(productsService.getFilters).mockResolvedValue(payload);

    const out = await getCachedProductFilters({ lang: "en", search: "x" });
    expect(out.cacheStatus).toBe("MISS");
    expect(out.result).toEqual(payload);
    expect(cacheService.setex).toHaveBeenCalled();
  });
});
