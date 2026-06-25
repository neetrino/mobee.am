import type { LanguageCode } from './language';
import { type Namespace, VALID_NAMESPACES } from './i18n-types';

import enCommon from '../locales/en/common.json';
import enAdmin from '../locales/en/admin.json';

type TranslationRecord = Record<string, unknown>;
type LocaleStore = Partial<Record<Namespace, TranslationRecord>>;

const localeStores: Partial<Record<LanguageCode, LocaleStore>> = {
  en: {
    common: enCommon as TranslationRecord,
    admin: enAdmin as TranslationRecord,
  },
};

const inflightLoads = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeLazyTranslations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearLazyTranslationStore(): void {
  inflightLoads.clear();
  for (const lang of Object.keys(localeStores) as LanguageCode[]) {
    if (lang === 'en') {
      localeStores[lang] = {
        common: enCommon as TranslationRecord,
        admin: enAdmin as TranslationRecord,
      };
      continue;
    }
    delete localeStores[lang];
  }
  notifyListeners();
}

function getNamespaceLoader(lang: LanguageCode, namespace: Namespace): () => Promise<{ default: TranslationRecord }> {
  switch (lang) {
    case 'en':
      switch (namespace) {
        case 'common': return () => import('../locales/en/common.json');
        case 'home': return () => import('../locales/en/home.json');
        case 'product': return () => import('../locales/en/product.json');
        case 'products': return () => import('../locales/en/products.json');
        case 'attributes': return () => import('../locales/en/attributes.json');
        case 'delivery': return () => import('../locales/en/delivery.json');
        case 'about': return () => import('../locales/en/about.json');
        case 'contact': return () => import('../locales/en/contact.json');
        case 'faq': return () => import('../locales/en/faq.json');
        case 'login': return () => import('../locales/en/login.json');
        case 'cookies': return () => import('../locales/en/cookies.json');
        case 'delivery-terms': return () => import('../locales/en/delivery-terms.json');
        case 'terms': return () => import('../locales/en/terms.json');
        case 'privacy': return () => import('../locales/en/privacy.json');
        case 'support': return () => import('../locales/en/support.json');
        case 'stores': return () => import('../locales/en/stores.json');
        case 'returns': return () => import('../locales/en/returns.json');
        case 'refund-policy': return () => import('../locales/en/refund-policy.json');
        case 'profile': return () => import('../locales/en/profile.json');
        case 'checkout': return () => import('../locales/en/checkout.json');
        case 'register': return () => import('../locales/en/register.json');
        case 'categories': return () => import('../locales/en/categories.json');
        case 'orders': return () => import('../locales/en/orders.json');
        case 'admin': return () => import('../locales/en/admin.json');
      }
      break;
    case 'hy':
      switch (namespace) {
        case 'common': return () => import('../locales/hy/common.json');
        case 'home': return () => import('../locales/hy/home.json');
        case 'product': return () => import('../locales/hy/product.json');
        case 'products': return () => import('../locales/hy/products.json');
        case 'attributes': return () => import('../locales/hy/attributes.json');
        case 'delivery': return () => import('../locales/hy/delivery.json');
        case 'about': return () => import('../locales/hy/about.json');
        case 'contact': return () => import('../locales/hy/contact.json');
        case 'faq': return () => import('../locales/hy/faq.json');
        case 'login': return () => import('../locales/hy/login.json');
        case 'cookies': return () => import('../locales/hy/cookies.json');
        case 'delivery-terms': return () => import('../locales/hy/delivery-terms.json');
        case 'terms': return () => import('../locales/hy/terms.json');
        case 'privacy': return () => import('../locales/hy/privacy.json');
        case 'support': return () => import('../locales/hy/support.json');
        case 'stores': return () => import('../locales/hy/stores.json');
        case 'returns': return () => import('../locales/hy/returns.json');
        case 'refund-policy': return () => import('../locales/hy/refund-policy.json');
        case 'profile': return () => import('../locales/hy/profile.json');
        case 'checkout': return () => import('../locales/hy/checkout.json');
        case 'register': return () => import('../locales/hy/register.json');
        case 'categories': return () => import('../locales/hy/categories.json');
        case 'orders': return () => import('../locales/hy/orders.json');
        case 'admin': return () => import('../locales/hy/admin.json');
      }
      break;
    case 'ru':
      switch (namespace) {
        case 'common': return () => import('../locales/ru/common.json');
        case 'home': return () => import('../locales/ru/home.json');
        case 'product': return () => import('../locales/ru/product.json');
        case 'products': return () => import('../locales/ru/products.json');
        case 'attributes': return () => import('../locales/ru/attributes.json');
        case 'delivery': return () => import('../locales/ru/delivery.json');
        case 'about': return () => import('../locales/ru/about.json');
        case 'contact': return () => import('../locales/ru/contact.json');
        case 'faq': return () => import('../locales/ru/faq.json');
        case 'login': return () => import('../locales/ru/login.json');
        case 'cookies': return () => import('../locales/ru/cookies.json');
        case 'delivery-terms': return () => import('../locales/ru/delivery-terms.json');
        case 'terms': return () => import('../locales/ru/terms.json');
        case 'privacy': return () => import('../locales/ru/privacy.json');
        case 'support': return () => import('../locales/ru/support.json');
        case 'stores': return () => import('../locales/ru/stores.json');
        case 'returns': return () => import('../locales/ru/returns.json');
        case 'refund-policy': return () => import('../locales/ru/refund-policy.json');
        case 'profile': return () => import('../locales/ru/profile.json');
        case 'checkout': return () => import('../locales/ru/checkout.json');
        case 'register': return () => import('../locales/ru/register.json');
        case 'categories': return () => import('../locales/ru/categories.json');
        case 'orders': return () => import('../locales/ru/orders.json');
        case 'admin': return () => import('../locales/ru/admin.json');
      }
      break;
  }

  throw new Error(`Missing namespace loader: ${lang}/${namespace}`);
}

export function syncLoadNamespace(lang: LanguageCode, namespace: Namespace): TranslationRecord | null {
  return localeStores[lang]?.[namespace] ?? null;
}

export async function ensureNamespace(lang: LanguageCode, namespace: Namespace): Promise<void> {
  if (localeStores[lang]?.[namespace]) {
    return;
  }

  const key = `${lang}:${namespace}`;
  const inflight = inflightLoads.get(key);
  if (inflight) {
    await inflight;
    return;
  }

  const loadPromise = (async () => {
    const loader = getNamespaceLoader(lang, namespace);
    const loadedModule = await loader();
    if (!localeStores[lang]) {
      localeStores[lang] = {};
    }
    localeStores[lang]![namespace] = loadedModule.default;
    notifyListeners();
  })();

  inflightLoads.set(key, loadPromise);
  try {
    await loadPromise;
  } finally {
    inflightLoads.delete(key);
  }
}

export async function preloadNamespaces(lang: LanguageCode, namespaces: Namespace[]): Promise<void> {
  await Promise.all(namespaces.map((namespace) => ensureNamespace(lang, namespace)));
}

export async function preloadAdminNamespaces(lang: LanguageCode): Promise<void> {
  await preloadNamespaces(lang, ['common', 'admin']);
  if (lang !== 'en') {
    await preloadNamespaces('en', ['common', 'admin']);
  }
}

function getNestedValue(obj: TranslationRecord | null, keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as TranslationRecord)) {
      current = (current as TranslationRecord)[key];
    } else {
      return null;
    }
  }
  return current;
}

export function resolveLazyTranslation(lang: LanguageCode, path: string): string {
  if (!path || typeof path !== 'string') {
    return typeof path === 'string' ? path : '';
  }

  const parts = path.split('.');
  if (parts.length < 2) {
    return path;
  }

  const namespace = parts[0] as Namespace;
  if (!VALID_NAMESPACES.includes(namespace)) {
    return path;
  }

  const keys = parts.slice(1);
  let translationObj = syncLoadNamespace(lang, namespace);

  if (!translationObj && lang !== 'en') {
    translationObj = syncLoadNamespace('en', namespace);
  }

  if (!translationObj) {
    return path;
  }

  let value = getNestedValue(translationObj, keys);

  if (value === null && lang !== 'en') {
    const enObj = syncLoadNamespace('en', namespace);
    if (enObj) {
      value = getNestedValue(enObj, keys);
    }
  }

  if (value === null || value === undefined) {
    return path;
  }

  if (Array.isArray(value)) {
    return value as unknown as string;
  }

  return typeof value === 'string' ? value : path;
}

export function queueNamespaceLoad(lang: LanguageCode, path: string): void {
  const parts = path.split('.');
  if (parts.length < 2) {
    return;
  }

  const namespace = parts[0] as Namespace;
  if (!VALID_NAMESPACES.includes(namespace)) {
    return;
  }

  void ensureNamespace(lang, namespace);
  if (lang !== 'en') {
    void ensureNamespace('en', namespace);
  }
}
