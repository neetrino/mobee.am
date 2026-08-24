import { describe, expect, it } from "vitest";
import { productsFindFilterService } from "./products-find-filter.service";
import type { ProductFilters, ProductWithRelations } from "./products-find-query.service";

function createProduct(input: {
  id: string;
  title: string;
  price: number;
  createdAt: string;
}): ProductWithRelations {
  return {
    id: input.id,
    brandId: null,
    createdAt: new Date(input.createdAt),
    translations: [{ locale: "en", title: input.title }],
    variants: [{ price: input.price, options: [] }],
  } as unknown as ProductWithRelations;
}

function sortProducts(products: ProductWithRelations[], sort: ProductFilters["sort"]) {
  return productsFindFilterService.filterProducts(
    products,
    { sort, lang: "en" },
    []
  );
}

describe("productsFindFilterService sorting", () => {
  const products = [
    createProduct({ id: "2", title: "Bravo", price: 120, createdAt: "2026-01-02T00:00:00.000Z" }),
    createProduct({ id: "1", title: "Alpha", price: 80, createdAt: "2026-01-01T00:00:00.000Z" }),
    createProduct({ id: "3", title: "Charlie", price: 240, createdAt: "2026-01-03T00:00:00.000Z" }),
  ];

  it("sorts by price ascending", () => {
    const sorted = sortProducts([...products], "price-asc");
    expect(sorted.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("sorts by name descending", () => {
    const sorted = sortProducts([...products], "name-desc");
    expect(sorted.map((item) => item.id)).toEqual(["3", "2", "1"]);
  });

  it("uses createdAt for default sorting", () => {
    const sorted = sortProducts([...products], "default");
    expect(sorted.map((item) => item.id)).toEqual(["3", "2", "1"]);
  });
});

describe("productsFindFilterService brand tokens", () => {
  function createBrandedProduct(input: {
    id: string;
    brandId: string;
    slug: string;
    name: string;
  }): ProductWithRelations {
    return {
      id: input.id,
      brandId: input.brandId,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      translations: [{ locale: "en", title: input.name }],
      variants: [{ price: 100, options: [] }],
      brand: {
        id: input.brandId,
        slug: input.slug,
        translations: [{ locale: "en", name: input.name }],
      },
    } as unknown as ProductWithRelations;
  }

  const apple = createBrandedProduct({
    id: "p1",
    brandId: "brand_1",
    slug: "apple",
    name: "Apple",
  });
  const samsung = createBrandedProduct({
    id: "p2",
    brandId: "brand_2",
    slug: "samsung",
    name: "Samsung",
  });

  it("keeps products when the URL brand token is the home-logo slug", () => {
    const filtered = productsFindFilterService.filterProducts(
      [apple, samsung],
      { brand: "apple", lang: "en" },
      [],
    );
    expect(filtered.map((item) => item.id)).toEqual(["p1"]);
  });

  it("keeps products when the URL brand token is the database id", () => {
    const filtered = productsFindFilterService.filterProducts(
      [apple, samsung],
      { brand: "brand_2", lang: "en" },
      [],
    );
    expect(filtered.map((item) => item.id)).toEqual(["p2"]);
  });
});
