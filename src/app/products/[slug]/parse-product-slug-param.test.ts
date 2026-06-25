import { describe, expect, it } from "vitest";
import { parseProductSlugParam } from "@/app/products/[slug]/parse-product-slug-param";

describe("parseProductSlugParam", () => {
  it("returns slug only when no variant suffix", () => {
    expect(parseProductSlugParam("iphone-17-pro")).toEqual({
      slug: "iphone-17-pro",
      variantIdFromUrl: null,
    });
  });

  it("splits slug and variant id", () => {
    expect(parseProductSlugParam("iphone-17-pro:variant-1")).toEqual({
      slug: "iphone-17-pro",
      variantIdFromUrl: "variant-1",
    });
  });
});
