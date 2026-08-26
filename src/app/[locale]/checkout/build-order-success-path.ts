import {
  ORDER_PLACED_QUERY_PARAM,
  ORDER_PLACED_QUERY_VALUE,
} from '../orders/order-placed.constants';

export function buildOrderSuccessPath(
  orderNumber: string,
  options: { email: string; isLoggedIn: boolean }
): string {
  const params = new URLSearchParams({
    [ORDER_PLACED_QUERY_PARAM]: ORDER_PLACED_QUERY_VALUE,
  });

  if (!options.isLoggedIn) {
    params.set('email', options.email.trim());
  }

  return `/orders/${orderNumber}?${params.toString()}`;
}
