import { describe, expect, it } from "vitest";
import { parseCheckoutBody, safeParseCheckout } from "./checkout.schema";

describe("checkout.schema", () => {
  it("parses a valid cart-based checkout payload", () => {
    const payload = {
      cartId: "cart-123",
      firstName: "John",
      lastName: "Doe",
      email: "user@example.com",
      phone: "+37499123456",
      shippingMethod: "pickup",
      paymentMethod: "idram",
      locale: "hy",
      promoCode: "SPRING10",
    };

    expect(parseCheckoutBody(payload)).toEqual(payload);
    expect(safeParseCheckout(payload).success).toBe(true);
  });

  it("parses a valid guest checkout payload", () => {
    const payload = {
      items: [{ variantId: "v-1", productId: "p-1", quantity: 2 }],
      firstName: "Guest",
      lastName: "User",
      email: "guest@example.com",
      phone: "+37455123456",
      shippingMethod: "delivery",
      shippingAddress: {
        address: "Main street 10",
        city: "Yerevan",
      },
      paymentMethod: "cash_on_delivery",
    };

    expect(safeParseCheckout(payload).success).toBe(true);
  });

  it("rejects payload without cartId and items", () => {
    const payload = {
      email: "user@example.com",
      phone: "+37499123456",
      shippingMethod: "pickup",
      paymentMethod: "idram",
    };

    expect(() => parseCheckoutBody(payload)).toThrow();
    expect(safeParseCheckout(payload).success).toBe(false);
  });

  it("rejects delivery payload without city", () => {
    const payload = {
      cartId: "cart-123",
      email: "user@example.com",
      phone: "+37499123456",
      shippingMethod: "delivery",
      shippingAddress: {
        address: "Main street 10",
      },
      paymentMethod: "arca",
    };

    expect(() => parseCheckoutBody(payload)).toThrow();
    expect(safeParseCheckout(payload).success).toBe(false);
  });

  it("rejects unsupported locale", () => {
    const payload = {
      cartId: "cart-123",
      email: "user@example.com",
      phone: "+37499123456",
      shippingMethod: "pickup",
      paymentMethod: "idram",
      locale: "de",
    };

    expect(safeParseCheckout(payload).success).toBe(false);
  });
});
