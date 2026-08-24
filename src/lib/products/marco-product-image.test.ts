import { describe, expect, it } from "vitest";
import {
  isMarcoHostedProductImageUrl,
  productHasMarcoListingImage,
} from "./marco-product-image";

describe("marco-product-image", () => {
  it("detects Marco R2 paths and marco.am hosts", () => {
    expect(
      isMarcoHostedProductImageUrl(
        "https://cdn.example/products/marco/abc/image-01.jpg",
      ),
    ).toBe(true);
    expect(
      isMarcoHostedProductImageUrl(
        "https://cdn.example/products/imported/marco/07868.jpg",
      ),
    ).toBe(true);
    expect(
      isMarcoHostedProductImageUrl("https://marco.am/wp-content/uploads/a.jpg"),
    ).toBe(true);
  });

  it("does not treat official media as Marco", () => {
    expect(
      isMarcoHostedProductImageUrl(
        "https://cdn.example/products/official/samsung/a.jpg",
      ),
    ).toBe(false);
    expect(isMarcoHostedProductImageUrl(null)).toBe(false);
  });

  it("detects Marco listing image from product media", () => {
    expect(
      productHasMarcoListingImage({
        media: ["https://cdn.example/products/marco/x/image-01.jpg"],
      }),
    ).toBe(true);
    expect(
      productHasMarcoListingImage({
        media: ["https://cdn.example/products/official/x.jpg"],
      }),
    ).toBe(false);
  });
});
