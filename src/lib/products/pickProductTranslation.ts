type ProductTranslationLike = {
  locale: string;
  title?: string | null;
  slug?: string | null;
  subtitle?: string | null;
  descriptionHtml?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

const FALLBACK_LOCALES = ["en", "hy", "ru"] as const;

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Pick the best product translation for the UI language.
 * Falls back to another locale when the requested title is missing/empty
 * so listing/PDP never shows a blank product name.
 */
export function pickProductTranslation<T extends ProductTranslationLike>(
  translations: readonly T[],
  lang: string,
): T | null {
  if (!Array.isArray(translations) || translations.length === 0) {
    return null;
  }

  const byLocale = new Map(translations.map((row) => [row.locale, row]));
  const preferred = byLocale.get(lang);
  if (preferred && hasText(preferred.title)) {
    return preferred;
  }

  for (const locale of FALLBACK_LOCALES) {
    if (locale === lang) continue;
    const row = byLocale.get(locale);
    if (row && hasText(row.title)) {
      return row;
    }
  }

  const anyWithTitle = translations.find((row) => hasText(row.title));
  return anyWithTitle ?? preferred ?? translations[0] ?? null;
}

/**
 * Resolve a display title for the active language with locale fallback.
 */
export function resolveProductDisplayTitle(
  translations: readonly ProductTranslationLike[],
  lang: string,
): string {
  return pickProductTranslation(translations, lang)?.title?.trim() || "";
}
