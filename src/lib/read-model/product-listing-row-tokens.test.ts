import { describe, expect, it } from "vitest";
import {
  collectListingComboTokens,
  listingColorSizeComboTokens,
} from "./product-listing-row-tokens";

describe("listing combo tokens", () => {
  it("does not invent a color+size pair across variants", () => {
    const tokens = collectListingComboTokens(
      [
        {
          options: [
            {
              attributeKey: "color",
              value: "red",
              attributeValue: { value: "red", attribute: { key: "color" } },
            },
            {
              attributeKey: "size",
              value: "xl",
              attributeValue: { value: "XL", attribute: { key: "size" } },
            },
          ],
        },
        {
          options: [
            {
              attributeKey: "color",
              value: "blue",
              attributeValue: { value: "blue", attribute: { key: "color" } },
            },
            {
              attributeKey: "size",
              value: "m",
              attributeValue: { value: "M", attribute: { key: "size" } },
            },
          ],
        },
      ],
      "en",
    );

    expect(tokens).toContain("c:red|s:XL");
    expect(tokens).toContain("c:blue|s:M");
    expect(tokens).not.toContain("c:red|s:M");
    expect(tokens).not.toContain("c:blue|s:XL");
  });

  it("builds the same filter tokens the listing query uses", () => {
    expect(listingColorSizeComboTokens(["red"], ["XL"])).toEqual(["c:red|s:XL"]);
  });
});
