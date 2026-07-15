import { describe, expect, it } from "vitest";
import {
  normalizeProductUpdate,
  hasProductUpdateWork,
  needsAttributeValueImageSync,
} from "./normalize-product-update";

describe("normalize-product-update", () => {
  it("normalizes legacy flat payload to replace-style ops", () => {
    const ops = normalizeProductUpdate({
      title: "Title",
      slug: "slug",
      brandId: "b1",
      published: true,
      labels: [{ type: "new", value: "New", position: "top" }],
      attributeIds: ["a1", "a2"],
      media: ["https://cdn.example/a.jpg"],
      variants: [{ id: "v1", price: 10, stock: 1 }],
      locale: "en",
    });

    expect(ops.basic).toEqual({ title: "Title", slug: "slug" });
    expect(ops.product).toMatchObject({ brandId: "b1", published: true });
    expect(ops.labels).toEqual({
      replace: [{ type: "new", value: "New", position: "top" }],
    });
    expect(ops.attributes).toEqual({ replaceIds: ["a1", "a2"] });
    expect(ops.media).toEqual({ replace: ["https://cdn.example/a.jpg"] });
    expect(ops.variants?.legacyReplace).toHaveLength(1);
    expect(ops.locale).toBe("en");
  });

  it("passes through partial payload", () => {
    const ops = normalizeProductUpdate({
      variants: { update: [{ id: "v1", price: 50 }] },
    });
    expect(ops.variants).toEqual({ update: [{ id: "v1", price: 50 }] });
    expect(ops.labels).toBeUndefined();
    expect(ops.attributes).toBeUndefined();
  });

  it("treats empty / locale-only as no work", () => {
    expect(hasProductUpdateWork({})).toBe(false);
    expect(hasProductUpdateWork({ locale: "hy" })).toBe(false);
  });

  it("detects price-only as work without image sync", () => {
    const ops = normalizeProductUpdate({
      variants: { update: [{ id: "v1", price: 99 }] },
    });
    expect(hasProductUpdateWork(ops)).toBe(true);
    expect(needsAttributeValueImageSync(ops)).toBe(false);
  });

  it("needs image sync when imageUrl or options change", () => {
    expect(
      needsAttributeValueImageSync({
        variants: { update: [{ id: "v1", imageUrl: "https://x" }] },
      })
    ).toBe(true);
    expect(
      needsAttributeValueImageSync({
        variants: {
          update: [
            {
              id: "v1",
              options: [{ attributeKey: "color", value: "red" }],
            },
          ],
        },
      })
    ).toBe(true);
    expect(
      needsAttributeValueImageSync({
        variants: { create: [{ price: 1, stock: 1 }] },
      })
    ).toBe(true);
  });
});
