import { describe, expect, it, vi, beforeEach } from "vitest";
import { EXPRESS_DELIVERY_SURCHARGE_AMD } from "../../constants/checkout-shipping.constants";
import { isYerevanArea, resolveCheckoutShippingAmount } from "./checkout-shipping";
import { adminDeliveryService } from "../admin/admin-delivery.service";

vi.mock("../admin/admin-delivery.service", () => ({
  adminDeliveryService: {
    getDeliveryPrice: vi.fn(),
  },
}));

describe("checkout-shipping", () => {
  beforeEach(() => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockReset();
  });

  it("detects Yerevan variants", () => {
    expect(isYerevanArea("Yerevan")).toBe(true);
    expect(isYerevanArea("Երևան")).toBe(true);
    expect(isYerevanArea("Gyumri")).toBe(false);
  });

  it("applies free shipping at threshold", async () => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockResolvedValue(1000);
    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city: "Gyumri",
      country: "Armenia",
      subtotalAfterDiscountAmd: 8000,
      deliverySpeed: "standard",
    });
    expect(result.amount).toBe(0);
    expect(result.requiresQuote).toBe(false);
  });

  it("uses Yerevan fallback when DB has no price", async () => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockResolvedValue(0);
    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city: "Yerevan",
      country: "Armenia",
      subtotalAfterDiscountAmd: 1000,
      deliverySpeed: "standard",
    });
    expect(result.requiresQuote).toBe(false);
    expect(result.amount).toBe(1000);
  });

  it("uses fixed Yerevan rate below threshold even when DB has a different price", async () => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockResolvedValue(500);
    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city: "Yerevan",
      country: "Armenia",
      subtotalAfterDiscountAmd: 1000,
      deliverySpeed: "standard",
    });
    expect(adminDeliveryService.getDeliveryPrice).not.toHaveBeenCalled();
    expect(result.requiresQuote).toBe(false);
    expect(result.amount).toBe(1000);
  });

  it("uses admin price for non-Yerevan city below threshold", async () => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockResolvedValue(2500);
    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city: "Gyumri",
      country: "Armenia",
      subtotalAfterDiscountAmd: 1000,
      deliverySpeed: "standard",
    });
    expect(result.requiresQuote).toBe(false);
    expect(result.amount).toBe(2500);
  });

  it("requires quote for unknown region without DB price", async () => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockResolvedValue(0);
    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city: "Unknown Region City",
      country: "Armenia",
      subtotalAfterDiscountAmd: 1000,
      deliverySpeed: "standard",
    });
    expect(result.requiresQuote).toBe(true);
  });

  it("adds express surcharge when base is free", async () => {
    vi.mocked(adminDeliveryService.getDeliveryPrice).mockResolvedValue(0);
    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city: "Yerevan",
      country: "Armenia",
      subtotalAfterDiscountAmd: 9000,
      deliverySpeed: "express",
    });
    expect(result.amount).toBe(EXPRESS_DELIVERY_SURCHARGE_AMD);
    expect(result.requiresQuote).toBe(false);
  });
});
