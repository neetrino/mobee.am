import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/products.service", () => ({
  productsService: {
    findBySlug: vi.fn(),
  },
}));

vi.mock("@/lib/services/read-through-json-cache", () => ({
  getCachedJson: vi.fn(),
}));

import { productsService } from "@/lib/services/products.service";
import { getCachedJson } from "@/lib/services/read-through-json-cache";
import { getCachedProductBySlug } from "./products-slug-cached";

describe("getCachedProductBySlug", () => {
  beforeEach(() => {
    vi.mocked(productsService.findBySlug).mockReset();
    vi.mocked(getCachedJson).mockReset();
  });

  it("loads the product from the database and does not use Redis", async () => {
    const payload = { id: "p1", slug: "samsung-galaxy-z-fold7", variants: [] };
    vi.mocked(productsService.findBySlug).mockResolvedValue(payload as never);

    const out = await getCachedProductBySlug("samsung-galaxy-z-fold7", "en");

    expect(out.result).toEqual(payload);
    expect(out.cacheStatus).toBe("MISS");
    expect(productsService.findBySlug).toHaveBeenCalledWith("samsung-galaxy-z-fold7", "en");
    expect(getCachedJson).not.toHaveBeenCalled();
  });
});
