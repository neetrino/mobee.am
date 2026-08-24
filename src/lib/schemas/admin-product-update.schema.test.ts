import { describe, expect, it } from "vitest";
import {
  legacyProductUpdateSchema,
  partialProductUpdateSchema,
  safeParseAdminProductUpdate,
} from "./admin-product-update.schema";

describe("admin product update warrantyYears", () => {
  it("accepts 1 | 2 | 3 | null on partial product section", () => {
    for (const warrantyYears of [1, 2, 3, null] as const) {
      const parsed = partialProductUpdateSchema.safeParse({
        product: { warrantyYears },
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.product?.warrantyYears).toBe(warrantyYears);
      }
    }
  });

  it("rejects unsupported warrantyYears values", () => {
    for (const warrantyYears of [0, 4, 5, "lifetime"]) {
      const parsed = partialProductUpdateSchema.safeParse({
        product: { warrantyYears },
      });
      expect(parsed.success).toBe(false);
    }
  });

  it("accepts string years that normalize to 1|2|3", () => {
    const parsed = partialProductUpdateSchema.safeParse({
      product: { warrantyYears: "3" },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.product?.warrantyYears).toBe(3);
    }
  });

  it("accepts legacy flat warrantyYears", () => {
    const parsed = legacyProductUpdateSchema.safeParse({
      warrantyYears: 2,
    });
    expect(parsed.success).toBe(true);
  });

  it("safeParse rejects warrantyYears = 5", () => {
    const result = safeParseAdminProductUpdate({
      product: { warrantyYears: 5 },
    });
    expect(result.success).toBe(false);
  });
});
