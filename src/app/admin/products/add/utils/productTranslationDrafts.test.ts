import { describe, expect, it } from 'vitest';
import { prepareTranslationSubmit, type ProductTranslationBaselines } from './productTranslationDrafts';

const baselines: ProductTranslationBaselines = {
  hy: { title: 'Հեռախոս', slug: 'phone-hy', descriptionHtml: '' },
  en: { title: 'Phone', slug: 'phone-en', descriptionHtml: '' },
};

const formData = { title: 'Հեռախոս', slug: 'phone-hy', descriptionHtml: '' };

describe('prepareTranslationSubmit', () => {
  it('returns no writes when nothing changed', () => {
    const result = prepareTranslationSubmit({
      drafts: { hy: { title: 'Հեռախոս', descriptionHtml: '' }, en: { title: 'Phone', descriptionHtml: '' } },
      baselines,
      activeLocale: 'hy',
      formData,
      isEditMode: true,
    });
    expect(result.translationWrites).toEqual([]);
    expect(result.primaryLocale).toBe('hy');
  });

  it('writes only the changed locale and keeps its own slug', () => {
    const result = prepareTranslationSubmit({
      drafts: { hy: { title: 'Հեռախոս', descriptionHtml: '' }, en: { title: 'Smartphone', descriptionHtml: '' } },
      baselines,
      activeLocale: 'hy',
      formData,
      isEditMode: true,
    });
    expect(result.translationWrites).toEqual([
      { locale: 'en', basic: { title: 'Smartphone', descriptionHtml: null } },
    ]);
  });

  it('uses the default locale as primary when saving from another tab', () => {
    const result = prepareTranslationSubmit({
      drafts: { hy: { title: 'Հեռախոս', descriptionHtml: '' }, en: { title: 'Phone', descriptionHtml: '' } },
      baselines,
      activeLocale: 'en',
      formData: { ...formData, title: 'Phone v2' },
      isEditMode: true,
    });
    expect(result.primaryLocale).toBe('hy');
    expect(result.primaryFormData.title).toBe('Հեռախոս');
    expect(result.translationWrites).toEqual([
      { locale: 'en', basic: { title: 'Phone v2', descriptionHtml: null } },
    ]);
  });

  it('creates a new locale translation with the form slug', () => {
    const result = prepareTranslationSubmit({
      drafts: { ru: { title: 'Телефон', descriptionHtml: '' } },
      baselines,
      activeLocale: 'hy',
      formData,
      isEditMode: true,
    });
    expect(result.translationWrites).toEqual([
      { locale: 'ru', basic: { title: 'Телефон', descriptionHtml: null, slug: 'phone-hy' } },
    ]);
  });
});
