import { MIN_ORDER_SUBTOTAL_FOR_DELIVERY_AMD } from '../constants/checkout-shipping.constants';

/** Delivery is available when cart subtotal (after discount) is at least the minimum. */
export function isDeliveryAvailableForSubtotalAmd(subtotalAfterDiscountAmd: number): boolean {
  return subtotalAfterDiscountAmd >= MIN_ORDER_SUBTOTAL_FOR_DELIVERY_AMD;
}
