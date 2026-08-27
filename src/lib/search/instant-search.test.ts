import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@white-shop/db", () => ({
  Prisma: {},
  db: {
    productListingRow: {
      findMany: vi.fn(),
    },
    categoryTranslation: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/read-model/read-model-ready", () => ({
  isProductListingReadModelReady: vi.fn(),
}));

import { db } from "@white-shop/db";
import { isProductListingReadModelReady } from "@/lib/read-model/read-model-ready";
import {
  findInstantSearchResults,
  parseInstantSearchLang,
  parseInstantSearchLimit,
} from "./instant-search";

describe("parseInstantSearchLimit", () => {
  it("defaults and caps the limit", () => {
    expect(parseInstantSearchLimit(null)).toBe(8);
    expect(parseInstantSearchLimit("abc")).toBe(8);
    expect(parseInstantSearchLimit("100")).toBe(20);
  });
});

describe("parseInstantSearchLang", () => {
  it("accepts storefront locales and maps ka to en", () => {
    expect(parseInstantSearchLang("en")).toBe("en");
    expect(parseInstantSearchLang("ka")).toBe("en");
    expect(parseInstantSearchLang(null)).toBe("hy");
  });
});

describe("findInstantSearchResults", () => {
  beforeEach(() => {
    vi.mocked(isProductListingReadModelReady).mockReset();
    vi.mocked(db.productListingRow.findMany).mockReset();
    vi.mocked(db.categoryTranslation.findMany).mockReset();
    vi.mocked(db.product.findMany).mockReset();
  });

  it("reads from listing rows when the read model is ready", async () => {
    vi.mocked(isProductListingReadModelReady).mockResolvedValue(true);
    vi.mocked(db.productListingRow.findMany).mockResolvedValue([
      {
        productId: "p1",
        slug: "iphone-16",
        title: "iPhone 16",
        price: 999,
        hasPrice: true,
        compareAtPrice: 1099,
        image: "https://cdn.example/p.jpg",
        primaryCategoryId: "c1",
        categoryIds: ["c1"],
      },
    ] as never);
    vi.mocked(db.categoryTranslation.findMany).mockResolvedValue([
      { categoryId: "c1", title: "Phones" },
    ] as never);

    const results = await findInstantSearchResults({ q: "iphone", lang: "en", limit: 8 });

    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      {
        id: "p1",
        slug: "iphone-16",
        title: "iPhone 16",
        price: 999,
        hasPrice: true,
        compareAtPrice: 1099,
        image: "https://cdn.example/p.jpg",
        category: "Phones",
      },
    ]);
  });

  it("falls back to products when the listing projection is empty", async () => {
    vi.mocked(isProductListingReadModelReady).mockResolvedValue(false);
    vi.mocked(db.product.findMany).mockResolvedValue([
      {
        id: "p2",
        media: null,
        primaryCategoryId: null,
        translations: [{ locale: "hy", slug: "phone", title: "Phone" }],
        variants: [{ price: 10, priceOnRequest: false, compareAtPrice: null, imageUrl: null }],
        categories: [],
      },
    ] as never);

    const results = await findInstantSearchResults({ q: "phone", lang: "hy", limit: 8 });

    expect(db.productListingRow.findMany).not.toHaveBeenCalled();
    expect(results[0]?.id).toBe("p2");
    expect(results[0]?.hasPrice).toBe(true);
  });
});
