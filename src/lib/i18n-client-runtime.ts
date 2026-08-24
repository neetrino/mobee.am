import type { LanguageCode } from './language';
import { getStoredLanguage } from './language';
import { type ProductField } from './i18n-types';
import {
  ensureNamespace,
  queueNamespaceLoad,
  resolveLazyTranslation,
  syncLoadNamespace,
} from './i18n-lazy-loader';

export function clientT(lang: LanguageCode | undefined, path: string): string {
  const resolvedLang = lang ?? getStoredLanguage();
  queueNamespaceLoad(resolvedLang, path);
  return resolveLazyTranslation(resolvedLang, path);
}

export async function clientGetProductText(
  lang: LanguageCode | undefined,
  productId: string,
  field: ProductField
): Promise<string> {
  const resolvedLang = lang ?? getStoredLanguage();
  await ensureNamespace(resolvedLang, 'products');
  if (resolvedLang !== 'en') {
    await ensureNamespace('en', 'products');
  }

  return readProductField(resolvedLang, productId, field);
}

export function syncGetProductText(
  lang: LanguageCode | undefined,
  productId: string,
  field: ProductField
): string {
  const resolvedLang = lang ?? getStoredLanguage();
  queueNamespaceLoad(resolvedLang, 'products.products');
  return readProductField(resolvedLang, productId, field);
}

function readProductField(lang: LanguageCode, productId: string, field: ProductField): string {
  if (!productId) {
    return '';
  }

  let products = syncLoadNamespace(lang, 'products');
  if (!products && lang !== 'en') {
    products = syncLoadNamespace('en', 'products');
  }

  if (!products || typeof products !== 'object') {
    return '';
  }

  const product = (products as Record<string, unknown>)[productId];
  if (!product || typeof product !== 'object') {
    return '';
  }

  const value = (product as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

export async function clientGetAttributeLabel(
  lang: LanguageCode | undefined,
  type: string,
  value: string
): Promise<string> {
  const resolvedLang = lang ?? getStoredLanguage();
  await ensureNamespace(resolvedLang, 'attributes');
  if (resolvedLang !== 'en') {
    await ensureNamespace('en', 'attributes');
  }

  return readAttributeLabel(resolvedLang, type, value);
}

export function syncGetAttributeLabel(
  lang: LanguageCode | undefined,
  type: string,
  value: string
): string {
  const resolvedLang = lang ?? getStoredLanguage();
  queueNamespaceLoad(resolvedLang, 'attributes.color');
  return readAttributeLabel(resolvedLang, type, value);
}

function readAttributeLabel(lang: LanguageCode, type: string, value: string): string {
  if (!type || !value) {
    return value || '';
  }

  const normalizedValue = value.toLowerCase().trim();
  let attributes = syncLoadNamespace(lang, 'attributes');
  if (!attributes && lang !== 'en') {
    attributes = syncLoadNamespace('en', 'attributes');
  }

  if (!attributes || typeof attributes !== 'object') {
    return value;
  }

  const typeObj = (attributes as Record<string, unknown>)[type];
  if (!typeObj || typeof typeObj !== 'object') {
    return value;
  }

  const labels = typeObj as Record<string, unknown>;
  if (normalizedValue in labels && typeof labels[normalizedValue] === 'string') {
    return labels[normalizedValue];
  }

  for (const [key, label] of Object.entries(labels)) {
    if (key.toLowerCase() === normalizedValue && typeof label === 'string') {
      return label;
    }
  }

  return value;
}
