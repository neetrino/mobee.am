import { describe, expect, it } from "vitest";
import { readLanguageFromCookies } from "./language";

describe("readLanguageFromCookies", () => {
  it("returns hy when cookie missing", () => {
    expect(readLanguageFromCookies({ get: () => undefined })).toBe("hy");
  });

  it("returns valid locale from cookie", () => {
    expect(
      readLanguageFromCookies({
        get: (name: string) =>
          name === "shop_language" ? { value: "hy" } : undefined,
      }),
    ).toBe("hy");
  });

  it("rejects unknown cookie values", () => {
    expect(
      readLanguageFromCookies({
        get: () => ({ value: "xx" }),
      }),
    ).toBe("hy");
  });
});
