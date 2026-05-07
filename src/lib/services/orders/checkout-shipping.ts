import { adminDeliveryService } from "../admin/admin-delivery.service";
import {
  EXPRESS_DELIVERY_SURCHARGE_AMD,
  FREE_SHIPPING_THRESHOLD_AMD,
  YEREVAN_FALLBACK_SHIPPING_BELOW_THRESHOLD_AMD,
} from "../../constants/checkout-shipping.constants";

export type DeliverySpeed = "standard" | "express";

export interface ResolveCheckoutShippingParams {
  shippingMethod: string;
  city?: string | null;
  country?: string | null;
  subtotalAfterDiscountAmd: number;
  deliverySpeed: DeliverySpeed;
}

export interface ResolveCheckoutShippingResult {
  amount: number;
  requiresQuote: boolean;
}

/**
 * Detects Yerevan / Երևան for fallback flat rate when admin has no row.
 */
export function isYerevanArea(city: string): boolean {
  const trimmed = city.trim();
  if (!trimmed) {
    return false;
  }
  if (/yerevan|erevan|yerewan/i.test(trimmed)) {
    return true;
  }
  return trimmed.includes("Երևան") || trimmed.includes("երևան");
}

/**
 * Computes delivery charge server-side (never trust client totals).
 * Regions without admin price and without Yerevan match need a manual quote.
 */
export async function resolveCheckoutShippingAmount(
  params: ResolveCheckoutShippingParams
): Promise<ResolveCheckoutShippingResult> {
  if (params.shippingMethod !== "delivery") {
    return { amount: 0, requiresQuote: false };
  }

  const city = params.city?.trim();
  if (!city) {
    return { amount: 0, requiresQuote: false };
  }

  const country = (params.country ?? "Armenia").toString();
  const subtotalAfterDiscount = Math.max(0, params.subtotalAfterDiscountAmd);
  const qualifiesFreeShipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD_AMD;

  let baseShipping = 0;
  if (qualifiesFreeShipping) {
    baseShipping = 0;
  } else if (isYerevanArea(city)) {
    baseShipping = YEREVAN_FALLBACK_SHIPPING_BELOW_THRESHOLD_AMD;
  } else {
    const dbPrice = await adminDeliveryService.getDeliveryPrice(city, country);
    if (dbPrice > 0) {
      baseShipping = dbPrice;
    } else {
      return { amount: 0, requiresQuote: true };
    }
  }

  const expressExtra =
    params.deliverySpeed === "express" ? EXPRESS_DELIVERY_SURCHARGE_AMD : 0;
  const amount = Math.max(0, baseShipping + expressExtra);

  return { amount, requiresQuote: false };
}
