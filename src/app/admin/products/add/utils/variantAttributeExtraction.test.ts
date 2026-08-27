import { describe, expect, it } from "vitest";
import { extractColor } from "./variantAttributeExtraction";

describe("extractColor", () => {
  it("prefers relational options over a derived color field", () => {
    expect(
      extractColor({
        color: "default",
        options: [{ attributeKey: "color", value: "Jetblack" }],
      }),
    ).toBe("Jetblack");
  });

  it("does not invent a color from SKU-like identifiers", () => {
    expect(
      extractColor({
        color: "",
        options: [{ attributeKey: "storage", value: "256GB" }],
      }),
    ).toBe("");
  });
});
