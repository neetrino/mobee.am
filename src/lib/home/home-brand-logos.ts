export type HomeBrandLogo = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
};

export type BrandRowForHome = {
  id: string;
  slug: string;
  logoUrl: string | null;
  translations: Array<{ locale: string; name: string }>;
};

/**
 * Picks a brand name for the storefront locale, then English, then first row.
 */
export function pickHomeBrandName(
  translations: Array<{ locale: string; name: string }>,
  lang: string,
): string {
  const exact = translations.find((row) => row.locale === lang)?.name.trim();
  if (exact) {
    return exact;
  }
  const english = translations.find((row) => row.locale === 'en')?.name.trim();
  if (english) {
    return english;
  }
  return translations[0]?.name.trim() ?? '';
}

/**
 * Maps DB brand rows to home logo cards. Skips brands without a logo file.
 */
export function mapHomeBrandLogos(
  rows: BrandRowForHome[],
  lang: string,
): HomeBrandLogo[] {
  return rows.flatMap((row) => {
    const logoUrl = row.logoUrl?.trim() ?? '';
    if (!logoUrl) {
      return [];
    }
    return [
      {
        id: row.id,
        slug: row.slug,
        name: pickHomeBrandName(row.translations, lang) || row.slug,
        logoUrl,
      },
    ];
  });
}
