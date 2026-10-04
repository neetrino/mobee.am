import { describe, expect, it } from "vitest";
import {
  getAttributeProductCountMap,
  getAttributeValueProductCountMap,
} from "./attribute-value-product-counts";

describe("attribute-value-product-counts", () => {
  it("returns empty maps for empty id lists without querying", async () => {
    await expect(getAttributeValueProductCountMap([])).resolves.toEqual(new Map());
    await expect(getAttributeProductCountMap([])).resolves.toEqual(new Map());
  });
});
