import { describe, expect, it } from "vitest";
import { normalizeCatalogQuery } from "./catalog-query";

describe("normalizeCatalogQuery", () => {
  it("trims, dedupes, and drops empty/null tokens", () => {
    const query = normalizeCatalogQuery({
      brand: " apple, Samsung, apple, undefined, null, ",
      colors: "Black, BLACK, ,undefined",
      sizes: "m, M, ",
      search: "  iphone  ",
      lang: " hy ",
    });
    expect(query.brands).toEqual(["apple", "Samsung"]);
    expect(query.colors).toEqual(["black"]);
    expect(query.sizes).toEqual(["M"]);
    expect(query.search).toBe("iphone");
    expect(query.lang).toBe("hy");
  });

  it("ignores invalid numeric values and unknown sort", () => {
    const query = normalizeCatalogQuery({
      page: Number.NaN,
      limit: Number.NaN,
      minPrice: Number.NaN,
      maxPrice: Number.parseFloat("abc"),
      sort: "drop-table" as never,
    });
    expect(query.page).toBe(1);
    expect(query.limit).toBe(12);
    expect(query.minPrice).toBeUndefined();
    expect(query.maxPrice).toBeUndefined();
    expect(query.sort).toBe("default");
  });

  it("caps limit and keeps page as a positive integer", () => {
    const query = normalizeCatalogQuery({ page: 0, limit: 500 });
    expect(query.page).toBe(1);
    expect(query.limit).toBe(200);
  });

  it("ignores unknown filter values", () => {
    const query = normalizeCatalogQuery({ filter: "clearance" });
    expect(query.filter).toBeUndefined();
  });
});
