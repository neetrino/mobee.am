import { describe, expect, it } from "vitest";
import {
  formatCatalogMoneyForEmail,
  toDisplayCatalogAmount,
} from "./checkout-email-money";

describe("checkout-email-money", () => {
  it("converts USD catalog price to AMD for email display", () => {
    expect(toDisplayCatalogAmount(30, "AMD")).toBe(12_000);
    expect(formatCatalogMoneyForEmail(30, "AMD")).toBe("12,000 Դ");
  });

  it("keeps USD when display currency is USD", () => {
    expect(toDisplayCatalogAmount(30, "USD")).toBe(30);
    expect(formatCatalogMoneyForEmail(30, "USD")).toBe("30 $");
  });
});
