import { describe, expect, it } from "vitest";
import { CatalogQueryError } from "./catalog-query-error";
import { parseCatalogHttpParams } from "./catalog-http-query";

describe("parseCatalogHttpParams", () => {
  it("rejects partial numeric strings", () => {
    expect(() =>
      parseCatalogHttpParams({ page: "1abc", limit: "12xyz" }, "en"),
    ).toThrow(CatalogQueryError);
  });

  it("rejects negative prices", () => {
    expect(() => parseCatalogHttpParams({ minPrice: "-10" }, "en")).toThrow(
      CatalogQueryError,
    );
  });

  it("rejects reversed price ranges", () => {
    expect(() =>
      parseCatalogHttpParams({ minPrice: "90", maxPrice: "10" }, "en"),
    ).toThrow(CatalogQueryError);
  });

  it("rejects unknown sort and filter", () => {
    expect(() => parseCatalogHttpParams({ sort: "drop-table" }, "en")).toThrow(
      CatalogQueryError,
    );
    expect(() => parseCatalogHttpParams({ filter: "clearance" }, "en")).toThrow(
      CatalogQueryError,
    );
  });

  it("accepts valid catalog query strings", () => {
    const filters = parseCatalogHttpParams(
      {
        page: "2",
        limit: "12",
        minPrice: "0",
        maxPrice: "100.5",
        sort: "price-desc",
        filter: "new",
      },
      "hy",
    );
    expect(filters.page).toBe(2);
    expect(filters.limit).toBe(12);
    expect(filters.minPrice).toBe(0);
    expect(filters.maxPrice).toBe(100.5);
    expect(filters.sort).toBe("price-desc");
    expect(filters.filter).toBe("new");
    expect(filters.lang).toBe("hy");
  });
});
