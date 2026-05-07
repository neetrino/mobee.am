import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../../lib/api-client';
import { convertPrice } from '../../../lib/currency';
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

  const subtotalAfterDiscountAmd = useMemo(() => {
    if (!cart) {
      return 0;
    }
    const sub = convertPrice(cart.totals.subtotal, 'USD', 'AMD');
    const disc = convertPrice(cart.totals.discount, 'USD', 'AMD');
    return Math.max(0, sub - disc);
  }, [cart]);

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
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [shippingCity, shippingMethod, subtotalAfterDiscountAmd, deliverySpeed]);

  return { deliveryPrice, loadingDeliveryPrice, requiresRegionalQuote, subtotalAfterDiscountAmd };
}
