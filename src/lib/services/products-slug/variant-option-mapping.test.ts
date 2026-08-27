import { describe, expect, it } from "vitest";
import {
  extractColorFromTrailingParentheses,
  mapVariantOptions,
  recoverMissingColorFromVariant,
} from "./variant-option-mapping";
import type { ProductVariantWithOptions } from "./types";

type OptionStub = {
  attributeKey?: string;
  value?: string;
  attributeValue?: {
    id: string;
    value: string;
    attribute: { key: string; id: string };
    translations: Array<{ locale: string; label: string }>;
    colors: string[] | null;
    imageUrl: string | null;
  } | null;
};

function variantStub(partial: {
  options?: OptionStub[];
  media?: unknown;
  attributes?: unknown;
}): ProductVariantWithOptions {
  return {
    id: "v1",
    sku: "mobilecentre-32308",
    price: 100,
    stock: 1,
    published: true,
    options: [],
    ...partial,
  } as unknown as ProductVariantWithOptions;
}

describe("extractColorFromTrailingParentheses", () => {
  it("reads Jetblack from MobileCentre titles", () => {
    expect(extractColorFromTrailingParentheses("Samsung Galaxy Z Fold 7 256GB (Jetblack)")).toBe(
      "Jetblack",
    );
  });

  it("ignores storage and connectivity parentheses", () => {
    expect(extractColorFromTrailingParentheses("Phone (256GB)")).toBeNull();
    expect(extractColorFromTrailingParentheses("Phone (5G)")).toBeNull();
    expect(extractColorFromTrailingParentheses("AC (AS-09HR4SYDDJ3)")).toBeNull();
    expect(extractColorFromTrailingParentheses("Device (EU)")).toBeNull();
  });
});

describe("mapVariantOptions", () => {
  it("keeps relational color options", () => {
    const options = mapVariantOptions(
      variantStub({
        options: [
          {
            attributeKey: "color",
            value: "Blue Shadow",
            attributeValue: {
              id: "c1",
              value: "Blue Shadow",
              attribute: { key: "color", id: "a-color" },
              translations: [],
              colors: ["#276787"],
              imageUrl: null,
            },
          },
        ],
      }),
    );
    expect(options.find((option) => option.key === "color")?.value).toBe("Blue Shadow");
  });

  it("recovers Jetblack from media alt when the color option is missing", () => {
    const options = mapVariantOptions(
      variantStub({
        options: [
          { attributeKey: "storage", value: "256GB" },
          { attributeKey: "sim", value: "eSIM" },
        ],
        media: [{ url: "/jet.png", alt: "Samsung Galaxy Z Fold 7 256GB (Jetblack)" }],
        attributes: { storage: "256GB", connectivity: "5G", sim: "eSIM" },
      }),
    );
    expect(options.find((option) => option.key === "color")?.value).toBe("Jetblack");
    expect(options.find((option) => option.key === "storage")?.value).toBe("256GB");
  });

  it("fills color from JSONB when relational options omit it", () => {
    const options = mapVariantOptions(
      variantStub({
        options: [
          { attributeKey: "storage", value: "512GB" },
        ],
        attributes: { color: "Silver Shadow", storage: "512GB" },
      }),
    );
    expect(options.find((option) => option.key === "color")?.value).toBe("Silver Shadow");
  });
});

describe("recoverMissingColorFromVariant", () => {
  it("reads the first media alt with a trailing color", () => {
    expect(
      recoverMissingColorFromVariant({
        media: [{ alt: "Samsung Galaxy Z Fold 7 512GB (Jetblack)" }],
      }),
    ).toBe("Jetblack");
  });
});
