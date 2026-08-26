import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultCurrencyRates } from "@/lib/checkout/checkout-email-money";
import { adminService } from "@/lib/services/admin.service";
import { resolveCheckoutOutboxCurrencyRates } from "./resolve-checkout-outbox-currency-rates";

vi.mock("@/lib/services/admin.service", () => ({
  adminService: {
    getSettings: vi.fn(),
  },
}));

describe("resolveCheckoutOutboxCurrencyRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings currency rates when available", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({
      globalDiscount: 0,
      categoryDiscounts: {},
      brandDiscounts: {},
      defaultCurrency: "AMD",
      currencyRates: { USD: 1, AMD: 410, EUR: 0.9, RUB: 88, GEL: 2.6 },
    });

    await expect(resolveCheckoutOutboxCurrencyRates()).resolves.toEqual({
      USD: 1,
      AMD: 410,
      EUR: 0.9,
      RUB: 88,
      GEL: 2.6,
    });
  });

  it("falls back to default rates when getSettings throws", async () => {
    vi.mocked(adminService.getSettings).mockRejectedValue(new Error("settings unavailable"));

    await expect(resolveCheckoutOutboxCurrencyRates()).resolves.toEqual(getDefaultCurrencyRates());
  });
});
