export const ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT = 5;
export const ADMIN_GLOBAL_SEARCH_MAX_LIMIT = 20;

export interface AdminGlobalProductResult {
  entity: 'product';
  id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
}

export interface AdminGlobalOrderResult {
  entity: 'order';
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: number;
  customerEmail: string;
}

export function parseAdminGlobalSearchLimit(raw: string | null): number {
  const parsed = parseInt(raw ?? String(ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT;
  }
  return Math.min(parsed, ADMIN_GLOBAL_SEARCH_MAX_LIMIT);
}

export function mapAdminGlobalProductResult(product: {
  id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
}): AdminGlobalProductResult {
  return {
    entity: 'product',
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price,
    stock: product.stock,
  };
}

export function mapAdminGlobalOrderResult(order: {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: number;
  customerEmail: string;
}): AdminGlobalOrderResult {
  return {
    entity: 'order',
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    customerEmail: order.customerEmail,
  };
}
