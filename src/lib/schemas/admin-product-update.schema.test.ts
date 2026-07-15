import { describe, expect, it } from "vitest";
import {
  safeParseAdminProductUpdate,
  isPartialProductUpdatePayload,
} from "./admin-product-update.schema";

describe("admin-product-update.schema", () => {
  describe("isPartialProductUpdatePayload", () => {
    it("detects partial shape by basic/product", () => {
      expect(isPartialProductUpdatePayload({ basic: { title: "A" } })).toBe(true);
      expect(isPartialProductUpdatePayload({ product: { published: true } })).toBe(
        true
      );
    });

    it("detects partial variants object vs legacy array", () => {
      expect(
        isPartialProductUpdatePayload({
          variants: { update: [{ id: "v1", price: 10 }] },
        })
      ).toBe(true);
      expect(
        isPartialProductUpdatePayload({
          variants: [{ price: 10, stock: 1 }],
        })
      ).toBe(false);
    });
  });

  describe("safeParseAdminProductUpdate", () => {
    it("parses price-only partial update", () => {
      const result = safeParseAdminProductUpdate({
        variants: { update: [{ id: "var-1", price: 199 }] },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.format).toBe("partial");
      }
    });

    it("parses legacy flat payload", () => {
      const result = safeParseAdminProductUpdate({
        title: "Phone",
        slug: "phone",
        published: true,
        variants: [{ id: "v1", price: 100, stock: 2 }],
        attributeIds: ["a1"],
        labels: [{ type: "sale", value: "10%", position: "top" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.format).toBe("legacy");
      }
    });

    it("rejects update variant without id", () => {
      const result = safeParseAdminProductUpdate({
        variants: { update: [{ price: 10 }] },
      });
      expect(result.success).toBe(false);
    });

    it("ignores mainProductImage on legacy payload", () => {
      const result = safeParseAdminProductUpdate({
        title: "X",
        mainProductImage: "https://cdn.example/x.jpg",
      });
      expect(result.success).toBe(true);
    });
  });
});
