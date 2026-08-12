import { describe, expect, it } from "vitest";
import { pickProductTranslation, resolveProductDisplayTitle } from "./pickProductTranslation";

describe("pickProductTranslation", () => {
  const translations = [
    { locale: "en", title: "Samsung TV" },
    { locale: "hy", title: "Հեռուստացույց Samsung" },
    { locale: "ru", title: "Телевизор Samsung" },
  ];

  it("returns requested locale when title exists", () => {
    expect(pickProductTranslation(translations, "hy")?.title).toBe(
      "Հեռուստացույց Samsung",
    );
  });

  it("falls back when requested locale row is missing", () => {
    const enOnly = [{ locale: "en", title: "Samsung TV" }];
    expect(resolveProductDisplayTitle(enOnly, "hy")).toBe("Samsung TV");
    expect(resolveProductDisplayTitle(enOnly, "ru")).toBe("Samsung TV");
  });

  it("skips empty titles", () => {
    const mixed = [
      { locale: "hy", title: "" },
      { locale: "en", title: "Phone" },
    ];
    expect(resolveProductDisplayTitle(mixed, "hy")).toBe("Phone");
  });
});
