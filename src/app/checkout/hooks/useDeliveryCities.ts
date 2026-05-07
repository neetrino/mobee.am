import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { ARMENIA_FALLBACK_DELIVERY_CITIES } from '../../../lib/constants/armenia-delivery-cities.constants';

export function useDeliveryCities() {
  const [cities, setCities] = useState<string[]>(() => [...ARMENIA_FALLBACK_DELIVERY_CITIES]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<{ cities: string[] }>('/api/v1/delivery/cities', {
          params: { country: 'Armenia' },
        });
        if (!cancelled && Array.isArray(response.cities) && response.cities.length > 0) {
          setCities(response.cities);
        }
      } catch {
        if (!cancelled) {
          setCities([...ARMENIA_FALLBACK_DELIVERY_CITIES]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading };
}
