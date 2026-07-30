import type { LanguageCode } from './language';
import { type Namespace, VALID_NAMESPACES } from './i18n-types';

import enCommon from '../locales/en/common.json';
import enHome from '../locales/en/home.json';
import enProduct from '../locales/en/product.json';
import hyCommon from '../locales/hy/common.json';
import hyHome from '../locales/hy/home.json';
import hyProduct from '../locales/hy/product.json';
import ruCommon from '../locales/ru/common.json';
import ruHome from '../locales/ru/home.json';
import ruProduct from '../locales/ru/product.json';

type TranslationRecord = Record<string, unknown>;
type LocaleStore = Partial<Record<Namespace, TranslationRecord>>;

const STOREFRONT_SEED_BY_LANG: Partial<Record<LanguageCode, LocaleStore>> = {
  en: {
    common: enCommon as TranslationRecord,
    home: enHome as TranslationRecord,
    product: enProduct as TranslationRecord,
  },
  hy: {
    common: hyCommon as TranslationRecord,
    home: hyHome as TranslationRecord,
    product: hyProduct as TranslationRecord,
  },
  ru: {
    common: ruCommon as TranslationRecord,
    home: ruHome as TranslationRecord,
    product: ruProduct as TranslationRecord,
  },
};

const localeStores: Partial<Record<LanguageCode, LocaleStore>> = {
  en: { ...STOREFRONT_SEED_BY_LANG.en },
};

const inflightLoads = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let translationRevision = 0;
/** Bumped on clear so in-flight lazy imports do not write into a wiped store. */
let storeGeneration = 0;

export function getLazyTranslationRevision(): number {
  return translationRevision;
}

function notifyListeners(): void {
  translationRevision += 1;
  // Defer so subscribers never setState during another component's render.
  queueMicrotask(() => {
    listeners.forEach((listener) => listener());
  });
}

/**
 * Synchronously seeds storefront-critical namespaces for SSR and first paint.
 * `common`, `home`, and `product` must be available before lazy loads complete to avoid hydration mismatches on PDP.
 */
export function seedStorefrontLocale(lang: LanguageCode): void {
  const seed = STOREFRONT_SEED_BY_LANG[lang];
  if (!seed) {
    return;
  }

  if (!localeStores[lang]) {
    localeStores[lang] = {};
  }

  Object.assign(localeStores[lang]!, seed);
}

export function subscribeLazyTranslations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearLazyTranslationStore(): void {
  storeGeneration += 1;
  inflightLoads.clear();
  for (const lang of Object.keys(localeStores) as LanguageCode[]) {
    const seed = STOREFRONT_SEED_BY_LANG[lang];
    if (seed) {
      localeStores[lang] = { ...seed };
      continue;
    }
    delete localeStores[lang];
  }
  notifyListeners();
}

export async function preloadStorefrontNamespaces(lang: LanguageCode): Promise<void> {
  await preloadNamespaces(lang, ['common', 'home', 'product']);
  if (lang !== 'en') {
    await preloadNamespaces('en', ['common', 'home', 'product']);
  }
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
        case 'credit': return () => import('../locales/en/credit.json');
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
        case 'credit': return () => import('../locales/hy/credit.json');
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
        case 'credit': return () => import('../locales/ru/credit.json');
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

  const generationAtStart = storeGeneration;
  const loadPromise = (async () => {
    const loader = getNamespaceLoader(lang, namespace);
    const loadedModule = await loader();
    if (generationAtStart !== storeGeneration) {
      return;
    }
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
    if (inflightLoads.get(key) === loadPromise) {
      inflightLoads.delete(key);
    }
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
