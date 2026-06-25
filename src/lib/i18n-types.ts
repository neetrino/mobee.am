export type Namespace =
  | 'common'
  | 'home'
  | 'product'
  | 'products'
  | 'attributes'
  | 'delivery'
  | 'about'
  | 'contact'
  | 'faq'
  | 'login'
  | 'cookies'
  | 'delivery-terms'
  | 'terms'
  | 'privacy'
  | 'support'
  | 'stores'
  | 'returns'
  | 'refund-policy'
  | 'profile'
  | 'checkout'
  | 'register'
  | 'categories'
  | 'orders'
  | 'admin';

export type ProductField = 'title' | 'shortDescription' | 'longDescription';

export const VALID_NAMESPACES: Namespace[] = [
  'common',
  'home',
  'product',
  'products',
  'attributes',
  'delivery',
  'about',
  'contact',
  'faq',
  'login',
  'cookies',
  'delivery-terms',
  'terms',
  'privacy',
  'support',
  'stores',
  'returns',
  'refund-policy',
  'profile',
  'checkout',
  'register',
  'categories',
  'orders',
  'admin',
];

export const ADMIN_CLIENT_NAMESPACES: Namespace[] = ['common', 'admin'];
