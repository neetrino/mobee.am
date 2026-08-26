export type CheckoutPurchaseIntent = 'buy_now' | 'aparik';

export type CheckoutFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  purchaseIntent: CheckoutPurchaseIntent;
  shippingMethod: 'pickup' | 'delivery';
  deliverySpeed: 'standard' | 'express';
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery' | 'aparik';
  promoCode?: string;
  shippingAddress?: string;
  shippingCity?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardHolderName?: string;
};

export interface CartItem {
  id: string;
  variant: {
    id: string;
    sku: string;
    product: {
      id: string;
      title: string;
      slug: string;
      image?: string | null;
    };
  };
  quantity: number;
  price: number;
  total: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
  };
  itemsCount: number;
}
