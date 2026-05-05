import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getStoredLanguage: vi.fn(),
}));

vi.mock("../api-client", () => ({
  apiClient: {
    get: mocks.get,
  },
}));

vi.mock("../language", () => ({
  getStoredLanguage: mocks.getStoredLanguage,
}));

import { fetchProductBySlugWithLang } from "./fetchProductBySlugWithLang";

describe("fetchProductBySlugWithLang", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries with en when storefront lang returns 404", async () => {
    mocks.getStoredLanguage.mockReturnValue("hy");
    const notFound = { status: 404 };
    mocks.get
      .mockRejectedValueOnce(notFound)
      .mockResolvedValueOnce({ id: "p-canonical", slug: "x", variants: [] });

    const result = await fetchProductBySlugWithLang<{ id: string }>("encoded-slug");
    expect(result.id).toBe("p-canonical");
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/v1/products/encoded-slug", {
      params: { lang: "hy" },
    });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/api/v1/products/encoded-slug", {
      params: { lang: "en" },
    });
  });

  it("does not retry when storefront lang is already en", async () => {
    mocks.getStoredLanguage.mockReturnValue("en");
    mocks.get.mockRejectedValue({ status: 404 });
    await expect(fetchProductBySlugWithLang("slug")).rejects.toEqual({ status: 404 });
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
});
