import { useMemo } from 'react';
import { convertPrice, type CurrencyCode } from '../../../lib/currency';
import {
  cartAmountToDisplayCurrency,
  cartTotalsToAmd,
  cartTotalsToDisplayCurrency,
} from '../../../lib/checkout/cart-money';
import type { Cart } from '../types';

interface UseOrderSummaryProps {
  cart: Cart | null;
  shippingMethod: 'pickup' | 'delivery';
  deliveryPrice: number | null;
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  requiresRegionalQuote: boolean;
}

export function useOrderSummary({
  cart,
  shippingMethod,
  deliveryPrice,
  currency,
  requiresRegionalQuote,
}: UseOrderSummaryProps) {
  const orderSummary = useMemo(() => {
    if (!cart || cart.items.length === 0) {
      return {
        subtotalAMD: 0,
        taxAMD: 0,
        shippingAMD: 0,
        totalAMD: 0,
        subtotalDisplay: 0,
        taxDisplay: 0,
        shippingDisplay: 0,
        totalDisplay: 0,
        totalExcludesPendingShipping: false,
      };
    }

    const subtotalAMD = cartTotalsToAmd(cart.totals);
    const taxAMD = cartAmountToDisplayCurrency(cart.totals.tax, 'AMD');
    const shippingBlocked = shippingMethod === 'delivery' && requiresRegionalQuote;
    const shippingAMD =
      shippingMethod === 'delivery' && deliveryPrice !== null && !shippingBlocked
        ? deliveryPrice
        : 0;
    const totalExcludesPendingShipping = shippingBlocked;

    const displayCurrency = currency as CurrencyCode;
    const subtotalDisplay = cartTotalsToDisplayCurrency(cart.totals, displayCurrency);
    const taxDisplay = cartAmountToDisplayCurrency(cart.totals.tax, displayCurrency);
    const shippingDisplay =
      displayCurrency === 'AMD'
        ? shippingAMD
        : convertPrice(shippingAMD, 'AMD', displayCurrency);
    const totalAMD = subtotalAMD + taxAMD + shippingAMD;
    const totalDisplay = subtotalDisplay + taxDisplay + shippingDisplay;

    return {
      subtotalAMD,
      taxAMD,
      shippingAMD,
      totalAMD,
      subtotalDisplay,
      taxDisplay,
      shippingDisplay,
      totalDisplay,
      totalExcludesPendingShipping,
    };
  }, [cart, shippingMethod, deliveryPrice, currency, requiresRegionalQuote]);

  return { orderSummary };
}
