// Language utilities
export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  hy: { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  ka: { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

/** Default storefront language when no cookie/localStorage preference exists. */
export const DEFAULT_LANGUAGE: LanguageCode = 'hy';

const LANGUAGE_STORAGE_KEY = 'shop_language';

/** Cookie mirrored from localStorage so server components can read the UI language. */
export const LANGUAGE_COOKIE_NAME = 'shop_language';

const LANGUAGE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function persistLanguageCookie(language: LanguageCode): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${encodeURIComponent(language)}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

/** Read locale from Next.js `cookies()` (server). */
export function readLanguageFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined },
): LanguageCode {
  const raw = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  if (!raw) return DEFAULT_LANGUAGE;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded in LANGUAGES) return decoded as LanguageCode;
  } catch {
    if (raw in LANGUAGES) return raw as LanguageCode;
  }
  return DEFAULT_LANGUAGE;
}

/** Align cookie with localStorage (e.g. returning visitors who only had LS). */
export function syncLanguageCookieFromStorage(): void {
  if (typeof window === 'undefined') return;
  persistLanguageCookie(getStoredLanguage());
}

export function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored in LANGUAGES) {
      return stored as LanguageCode;
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_LANGUAGE;
}

export function setStoredLanguage(language: LanguageCode, options?: { skipReload?: boolean }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    persistLanguageCookie(language);
    window.dispatchEvent(new Event('language-updated'));
    // Default behavior is now reactive update without full reload.
    // Reload can still be explicitly requested with `skipReload: false`.
    const shouldReload = options?.skipReload === false;
    if (shouldReload) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to save language:', error);
  }
}

