import { describe, expect, it } from "vitest";
import { parseProductSortOption } from "./sort";

describe("parseProductSortOption", () => {
  it("returns default when value is missing", () => {
    expect(parseProductSortOption(undefined)).toBe("default");
    expect(parseProductSortOption(null)).toBe("default");
  });

  it("returns default when value is invalid", () => {
    expect(parseProductSortOption("createdAt")).toBe("default");
    expect(parseProductSortOption("drop-table")).toBe("default");
  });

  it("keeps known sort values", () => {
    expect(parseProductSortOption("bestseller")).toBe("bestseller");
    expect(parseProductSortOption("price-asc")).toBe("price-asc");
    expect(parseProductSortOption("price-desc")).toBe("price-desc");
    expect(parseProductSortOption("name-asc")).toBe("name-asc");
    expect(parseProductSortOption("name-desc")).toBe("name-desc");
  });
});
