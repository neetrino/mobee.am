const PROFILE_ORDERS_TAB = 'orders';

export function getProfileOrdersPath(options?: { orderNumber?: string }): string {
  const params = new URLSearchParams({ tab: PROFILE_ORDERS_TAB });
  if (options?.orderNumber) {
    params.set('order', options.orderNumber);
  }
  return `/profile?${params.toString()}`;
}

export function getLoginRedirectToProfileOrdersPath(): string {
  return `/login?redirect=${encodeURIComponent(getProfileOrdersPath())}`;
}
