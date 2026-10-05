import {
  ADMIN_CONTENT_LOCALES,
  DEFAULT_ADMIN_CONTENT_LOCALE,
  type AdminContentLocale,
} from '@/lib/admin/admin-content-locale';

export interface ProductTranslationDraft {
  title: string;
  descriptionHtml: string;
}

export interface ProductTranslationBaseline extends ProductTranslationDraft {
  slug: string;
}

export type ProductTranslationDrafts = Partial<Record<AdminContentLocale, ProductTranslationDraft>>;
export type ProductTranslationBaselines = Partial<Record<AdminContentLocale, ProductTranslationBaseline>>;

/** Translation write sent as a partial `PUT` (`{ locale, basic }`). */
export interface ProductTranslationWrite {
  locale: AdminContentLocale;
  basic: {
    title: string;
    descriptionHtml: string | null;
    slug?: string;
  };
}

interface TranslatableFormData {
  title: string;
  slug: string;
  descriptionHtml: string;
}

interface PrepareTranslationSubmitInput<T extends TranslatableFormData> {
  drafts: ProductTranslationDrafts;
  baselines: ProductTranslationBaselines;
  activeLocale: AdminContentLocale;
  formData: T;
  isEditMode: boolean;
}

export interface PreparedTranslationSubmit<T extends TranslatableFormData> {
  primaryLocale: AdminContentLocale;
  primaryFormData: T;
  translationWrites: ProductTranslationWrite[];
}

/**
 * Builds baselines from the API `translations` map (only known admin locales).
 */
export function baselinesFromTranslations(
  translations: Record<string, { title: string; slug: string; descriptionHtml: string | null }>,
): ProductTranslationBaselines {
  const baselines: ProductTranslationBaselines = {};
  for (const locale of ADMIN_CONTENT_LOCALES) {
    const row = translations[locale];
    if (!row) continue;
    baselines[locale] = {
      title: row.title || '',
      slug: row.slug || '',
      descriptionHtml: row.descriptionHtml || '',
    };
  }
  return baselines;
}

function isDraftChanged(
  draft: ProductTranslationDraft,
  baseline: ProductTranslationBaseline | undefined,
): boolean {
  if (!baseline) return true;
  return draft.title.trim() !== baseline.title.trim() || draft.descriptionHtml !== baseline.descriptionHtml;
}

/**
 * Default locale is the primary (main payload) when it has a title; otherwise the active tab.
 */
function resolvePrimaryLocale(
  drafts: ProductTranslationDrafts,
  activeLocale: AdminContentLocale,
): AdminContentLocale {
  return drafts[DEFAULT_ADMIN_CONTENT_LOCALE]?.title.trim() ? DEFAULT_ADMIN_CONTENT_LOCALE : activeLocale;
}

/**
 * Returns writes only for locales whose draft differs from the loaded state.
 * Existing translations keep their own slug; new ones get the form slug.
 * In edit mode a missing primary translation is created as well.
 */
function collectTranslationWrites(input: {
  drafts: ProductTranslationDrafts;
  baselines: ProductTranslationBaselines;
  primaryLocale: AdminContentLocale;
  fallbackSlug: string;
  isEditMode: boolean;
}): ProductTranslationWrite[] {
  return ADMIN_CONTENT_LOCALES.flatMap((locale) => {
    const draft = input.drafts[locale];
    const title = draft?.title.trim() || '';
    if (!draft || !title) return [];

    const baseline = input.baselines[locale];
    const isPrimary = locale === input.primaryLocale;
    if (isPrimary && (baseline || !input.isEditMode)) return [];
    if (!isDraftChanged(draft, baseline)) return [];

    return [
      {
        locale,
        basic: {
          title,
          descriptionHtml: draft.descriptionHtml || null,
          ...(baseline ? {} : { slug: input.fallbackSlug }),
        },
      },
    ];
  });
}

/**
 * Commits the active tab into drafts and splits the submit into
 * the primary-locale form data and per-locale translation writes.
 */
export function prepareTranslationSubmit<T extends TranslatableFormData>({
  drafts,
  baselines,
  activeLocale,
  formData,
  isEditMode,
}: PrepareTranslationSubmitInput<T>): PreparedTranslationSubmit<T> {
  const committedDrafts: ProductTranslationDrafts = {
    ...drafts,
    [activeLocale]: { title: formData.title, descriptionHtml: formData.descriptionHtml },
  };
  const primaryLocale = resolvePrimaryLocale(committedDrafts, activeLocale);
  const primaryDraft = committedDrafts[primaryLocale];

  return {
    primaryLocale,
    primaryFormData: primaryDraft
      ? { ...formData, title: primaryDraft.title, descriptionHtml: primaryDraft.descriptionHtml }
      : formData,
    translationWrites: collectTranslationWrites({
      drafts: committedDrafts,
      baselines,
      primaryLocale,
      fallbackSlug: formData.slug,
      isEditMode,
    }),
  };
}
