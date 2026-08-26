import type { AparikCheckoutEmailPayload } from "@/lib/email/send-aparik-checkout-email";
import type { CheckoutDisplayCurrency } from "@/lib/checkout/checkout-email-money";
import type { CheckoutCartItemDetails } from "@/lib/services/orders/checkout-cart-item-details";

export type AparikCheckoutOutboxPayload = AparikCheckoutEmailPayload;

export function buildAparikCheckoutOutboxPayload(input: {
  orderNumber: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  shippingMethod: string;
  deliverySpeed?: string;
  shippingAddress?: AparikCheckoutEmailPayload["shippingAddress"];
  customerLocale: string;
  displayCurrency: CheckoutDisplayCurrency;
  currencyRates: Record<string, number>;
  promoCode?: string;
  cartItems: CheckoutCartItemDetails[];
  totals: {
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    total: number;
  };
}): AparikCheckoutOutboxPayload {
  return {
    orderNumber: input.orderNumber,
    customerEmail: input.email,
    customerPhone: input.phone,
    firstName: input.firstName,
    lastName: input.lastName,
    shippingMethod: input.shippingMethod,
    deliverySpeed: input.deliverySpeed,
    shippingAddress: input.shippingAddress ?? null,
    locale: input.customerLocale,
    displayCurrency: input.displayCurrency,
    currencyRates: input.currencyRates,
    promoCode: input.promoCode,
    items: input.cartItems.map((item) => ({
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.price * item.quantity,
      imageUrl: item.imageUrl,
      color: item.color,
      colorHex: item.colorHex,
    })),
    subtotal: input.totals.subtotal,
    discountAmount: input.totals.discountAmount,
    shippingAmount: input.totals.shippingAmount,
    taxAmount: input.totals.taxAmount,
    total: input.totals.total,
  };
}
