import { revalidatePath } from 'next/cache';
import { APP_LOCALES, addLocalePrefix } from '@/lib/i18n/routing';

const STOREFRONT_SHELL_PATHS = ['/', '/shop', '/products'] as const;

/**
 * Revalidate the unprefixed path and every locale-prefixed equivalent.
 */
export function revalidateStorefrontPath(pathname: string): void {
  revalidatePath(pathname);
  for (const locale of APP_LOCALES) {
    revalidatePath(addLocalePrefix(pathname, locale));
  }
}

export function revalidateStorefrontShell(): void {
  for (const pathname of STOREFRONT_SHELL_PATHS) {
    revalidateStorefrontPath(pathname);
  }
}
