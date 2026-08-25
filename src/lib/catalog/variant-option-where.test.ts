import { describe, expect, it } from "vitest";
import {
  buildVariantOptionWhere,
  variantMatchesColorAndSize,
  type CatalogOptionLike,
} from "./variant-option-where";

function colorOption(label: string): CatalogOptionLike {
  return {
    attributeValue: {
      value: label,
      attribute: { key: "color" },
      translations: [{ locale: "en", label }],
    },
  };
}

function sizeOption(label: string): CatalogOptionLike {
  return {
    attributeValue: {
      value: label,
      attribute: { key: "size" },
      translations: [{ locale: "en", label }],
    },
  };
}

function legacyColor(value: string): CatalogOptionLike {
  return { attributeKey: "color", value };
}

describe("variantMatchesColorAndSize", () => {
  it("matches AttributeValue color and size on the same variant", () => {
    const options = [colorOption("Space Black"), sizeOption("M")];
    expect(
      variantMatchesColorAndSize(options, ["space black"], ["M"], "en"),
    ).toBe(true);
  });

  it("does not match color and size from different option sets", () => {
    const colorOnly = [colorOption("Space Black")];
    const sizeOnly = [sizeOption("M")];
    expect(variantMatchesColorAndSize(colorOnly, ["space black"], ["M"], "en")).toBe(
      false,
    );
    expect(variantMatchesColorAndSize(sizeOnly, ["space black"], ["M"], "en")).toBe(
      false,
    );
  });

  it("supports legacy attributeKey/value color format", () => {
    expect(
      variantMatchesColorAndSize([legacyColor("Space Black")], ["space black"], [], "en"),
    ).toBe(true);
  });
});

describe("buildVariantOptionWhere", () => {
  it("requires color and size on the same published variant", () => {
    const where = buildVariantOptionWhere(["black"], ["M"]);
    expect(where?.variants).toMatchObject({
      some: {
        published: true,
        AND: [{ options: { some: expect.anything() } }, { options: { some: expect.anything() } }],
      },
    });
  });
});
