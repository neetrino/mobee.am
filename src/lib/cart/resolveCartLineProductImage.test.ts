import { describe, expect, it } from "vitest";
import { resolveCartLineProductImageUrl } from "./resolveCartLineProductImage";

describe("resolveCartLineProductImageUrl", () => {
  it("prefers variant imageUrl over product media", () => {
    expect(
      resolveCartLineProductImageUrl(
        { media: ["https://cdn.example.com/a.jpg"] },
        { imageUrl: "https://cdn.example.com/v.jpg" },
      ),
    ).toBe("https://cdn.example.com/v.jpg");
  });

  it("uses variant media when imageUrl is empty", () => {
    expect(
      resolveCartLineProductImageUrl(
        { media: ["https://cdn.example.com/a.jpg"] },
        { media: [{ url: "https://cdn.example.com/vm.jpg" }] },
      ),
    ).toBe("https://cdn.example.com/vm.jpg");
  });

  it("falls back to product media when variant has no image", () => {
    expect(
      resolveCartLineProductImageUrl({ media: ["https://cdn.example.com/a.jpg"] }, { imageUrl: null }),
    ).toBe("https://cdn.example.com/a.jpg");
  });

  it("falls back to variant imageUrl when product media empty", () => {
    expect(
      resolveCartLineProductImageUrl({ media: [] }, { imageUrl: "https://cdn.example.com/v.jpg" }),
    ).toBe("https://cdn.example.com/v.jpg");
  });

  it("uses first comma-separated variant URL", () => {
    expect(
      resolveCartLineProductImageUrl(
        { media: null },
        { imageUrl: "https://cdn.example.com/1.png,https://cdn.example.com/2.png" },
      ),
    ).toBe("https://cdn.example.com/1.png");
  });

  it("returns null when no media and no variant image", () => {
    expect(resolveCartLineProductImageUrl({ media: [] }, { imageUrl: null })).toBeNull();
  });
});
