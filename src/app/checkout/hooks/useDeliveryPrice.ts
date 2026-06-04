import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../../lib/api-client';
import { getCartSubtotalAfterDiscountAmd } from '../../../lib/checkout/cart-subtotal-amd';
import type { Cart } from '../types';

export function useDeliveryPrice(
  cart: Cart | null,
  shippingMethod: 'pickup' | 'delivery',
  shippingCity: string | undefined,
  deliverySpeed: 'standard' | 'express'
) {
  const [deliveryPrice, setDeliveryPrice] = useState<number | null>(null);
  const [loadingDeliveryPrice, setLoadingDeliveryPrice] = useState(false);
  const [requiresRegionalQuote, setRequiresRegionalQuote] = useState(false);

  const subtotalAfterDiscountAmd = useMemo(
    () => (cart ? getCartSubtotalAfterDiscountAmd(cart.totals) : 0),
    [cart]
  );

  useEffect(() => {
    const fetchDeliveryPrice = async () => {
      if (shippingMethod === 'delivery' && shippingCity && shippingCity.trim().length > 0) {
        setLoadingDeliveryPrice(true);
        try {
          const response = await apiClient.get<{
            price: number | null;
            requiresQuote: boolean;
          }>('/api/v1/delivery/price', {
            params: {
              city: shippingCity.trim(),
              country: 'Armenia',
              subtotalAfterDiscountAmd: String(subtotalAfterDiscountAmd),
              deliverySpeed,
            },
          });
          setRequiresRegionalQuote(Boolean(response.requiresQuote));
          setDeliveryPrice(response.requiresQuote ? null : response.price);
        } catch {
          setRequiresRegionalQuote(false);
          setDeliveryPrice(0);
        } finally {
          setLoadingDeliveryPrice(false);
        }
      } else {
        setDeliveryPrice(null);
        setRequiresRegionalQuote(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchDeliveryPrice();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [shippingCity, shippingMethod, subtotalAfterDiscountAmd, deliverySpeed]);

  return { deliveryPrice, loadingDeliveryPrice, requiresRegionalQuote, subtotalAfterDiscountAmd };
}
