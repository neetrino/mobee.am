import type { AppLocale } from '@/lib/i18n/routing';

/**
 * Skip navigation when the URL already shows this locale and nothing else is in flight.
 */
export function isLocaleSwitchNoop(
  urlLocale: AppLocale | null,
  nextLocale: AppLocale,
  requestedLocale: AppLocale | null,
): boolean {
  if (requestedLocale === nextLocale) {
    return true;
  }
  return urlLocale === nextLocale && requestedLocale === null;
}

/**
 * A slower earlier navigation committed after the user already picked another locale.
 */
export function shouldCorrectStaleLocaleNavigation(
  urlLocale: AppLocale | null,
  requestedLocale: AppLocale | null,
  inflightLocale: AppLocale | null,
): boolean {
  if (!requestedLocale || !urlLocale) {
    return false;
  }
  if (urlLocale === requestedLocale) {
    return false;
  }
  return inflightLocale !== requestedLocale;
}
