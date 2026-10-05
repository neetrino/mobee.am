import { describe, expect, it } from "vitest";
import { buildVariantMediaFromImageUrl, extractVariantMediaUrls } from "./variant-helpers";

describe("extractVariantMediaUrls", () => {
  it("reads string and object media entries", () => {
    expect(
      extractVariantMediaUrls(["https://cdn.example/a.jpg", { url: "https://cdn.example/b.jpg", alt: "B" }, null])
    ).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]);
  });

  it("returns empty list for non-array input", () => {
    expect(extractVariantMediaUrls(null)).toEqual([]);
  });
});

describe("buildVariantMediaFromImageUrl", () => {
  it("mirrors imageUrl order and keeps existing alt text", () => {
    const existing = [{ url: "https://cdn.example/b.jpg", alt: "Back" }, { url: "https://cdn.example/old.jpg" }];
    expect(buildVariantMediaFromImageUrl("https://cdn.example/a.jpg,https://cdn.example/b.jpg", existing)).toEqual([
      { url: "https://cdn.example/a.jpg" },
      { url: "https://cdn.example/b.jpg", alt: "Back" },
    ]);
  });

  it("clears media when imageUrl is null", () => {
    expect(buildVariantMediaFromImageUrl(null, [{ url: "https://cdn.example/a.jpg" }])).toEqual([]);
  });
});
