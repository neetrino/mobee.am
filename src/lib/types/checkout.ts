/**
 * Checkout types for orders service
 */

export interface CheckoutAcknowledgements {
  deliverySupplyTerms: boolean;
  inspectionAtDelivery: boolean;
  orderVerification: boolean;
  returnsPolicy: boolean;
}

export interface CheckoutData {
  cartId?: string;
  items?: Array<{
    variantId: string;
    productId: string;
    quantity: number;
  }>;
  email: string;
  phone: string;
  shippingMethod?: string;
  /** Applied when shippingMethod is delivery; otherwise ignored. */
  deliverySpeed?: "standard" | "express";
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
    phone?: string;
  };
  /** Ignored at checkout — server computes from shippingMethod + shippingAddress.city */
  shippingAmount?: number;
  paymentMethod?: string;
  promoCode?: string;
  locale?: "en" | "hy" | "ru";
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
    phone?: string;
  };
  acknowledgements: CheckoutAcknowledgements;
}




