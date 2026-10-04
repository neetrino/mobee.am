import { describe, expect, it } from "vitest";
import {
  parseCatalogAttrsParam,
  serializeCatalogAttrsParam,
  variantMatchesCatalogAttrs,
} from "./catalog-attrs";

describe("parseCatalogAttrsParam", () => {
  it("parses key:value pairs and ignores color/size", () => {
    expect(
      parseCatalogAttrsParam("storage:256GB,color:black,size:M,ram:8GB,storage:512GB"),
    ).toEqual({
      storage: ["256GB", "512GB"],
      ram: ["8GB"],
    });
  });

  it("returns empty for blank input", () => {
    expect(parseCatalogAttrsParam(undefined)).toEqual({});
    expect(parseCatalogAttrsParam("")).toEqual({});
    expect(parseCatalogAttrsParam("   ")).toEqual({});
  });
});

describe("serializeCatalogAttrsParam", () => {
  it("stable-sorts keys and values", () => {
    expect(
      serializeCatalogAttrsParam({
        ram: ["16GB", "8GB"],
        storage: ["512GB"],
      }),
    ).toBe("ram:16GB,ram:8GB,storage:512GB");
  });
});

describe("variantMatchesCatalogAttrs", () => {
  it("requires all selected keys on the same variant", () => {
    const options = [
      { attributeKey: "storage", value: "256GB" },
      { attributeKey: "ram", value: "8GB" },
    ];
    expect(
      variantMatchesCatalogAttrs(options, { storage: ["256GB"], ram: ["8GB"] }, "en"),
    ).toBe(true);
    expect(
      variantMatchesCatalogAttrs(options, { storage: ["512GB"] }, "en"),
    ).toBe(false);
  });
});
