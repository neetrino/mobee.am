import { t } from '../i18n';
import type { LanguageCode } from '../language';
import {
  PRODUCT_SPEC_ARMENIAN_LABEL_KEYS,
  PRODUCT_SPEC_ARMENIAN_LABEL_MAP,
  PRODUCT_SPEC_OS_STATUS_VALUES,
} from './product-spec-label-keys';

const SECTION_SLUG_TO_I18N_KEY: Record<string, string> = {
  general: 'product.specs.sections.general',
  screen: 'product.specs.sections.screen',
  cameras: 'product.specs.sections.cameras',
  memory: 'product.specs.sections.memory',
  network: 'product.specs.sections.network',
  power: 'product.specs.sections.power',
  other: 'product.specs.sections.other',
};

const TRANSLATED_LABEL_CACHE = new Map<string, Map<string, string>>();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function translateSpecLabel(lang: LanguageCode | undefined, i18nKey: string): string {
  const cacheKey = lang ?? 'en';
  let langCache = TRANSLATED_LABEL_CACHE.get(cacheKey);
  if (!langCache) {
    langCache = new Map();
    TRANSLATED_LABEL_CACHE.set(cacheKey, langCache);
  }

  const cached = langCache.get(i18nKey);
  if (cached) {
    return cached;
  }

  const translated = t(lang, i18nKey);
  const result = translated === i18nKey ? '' : translated;
  langCache.set(i18nKey, result);
  return result;
}

function resolveArmenianLabelKey(text: string): string | undefined {
  const decoded = decodeHtmlEntities(text).trim();
  return PRODUCT_SPEC_ARMENIAN_LABEL_MAP.get(decoded);
}

function buildSpecRow(label: string, value: string): string {
  return `<tr class="spec-row"><td class="spec-label">${escapeHtml(label)}</td><td class="spec-value">${escapeHtml(value)}</td></tr>`;
}

function stripProductStatusNoise(html: string, lang?: LanguageCode | undefined): string {
  return html.replace(/<p class="product-status">([\s\S]*?)<\/p>/g, (match, inner: string) => {
    const parts = inner
      .split('·')
      .map((part) => decodeHtmlEntities(part).trim())
      .filter(Boolean)
      .filter((part) => !PRODUCT_SPEC_OS_STATUS_VALUES.has(part.toLowerCase()))
      .map((part) => {
        const key = PRODUCT_SPEC_ARMENIAN_LABEL_MAP.get(part);
        if (!key) {
          return part;
        }
        const translated = translateSpecLabel(lang, key);
        return translated || part;
      });

    if (parts.length === 0) {
      return '';
    }

    return `<p class="product-status">${parts.map((part) => escapeHtml(part)).join(' · ')}</p>`;
  });
}

function repairSpecRows(html: string, lang: LanguageCode | undefined): string {
  return html.replace(
    /<tr class="spec-row"><td class="spec-label">([^<]*)<\/td><td class="spec-value">([^<]*)<\/td><\/tr>/g,
    (match, rawLabel: string, rawValue: string) => {
      const label = decodeHtmlEntities(rawLabel).trim();
      const value = decodeHtmlEntities(rawValue).trim();
      const labelKey = resolveArmenianLabelKey(label);
      const valueKey = resolveArmenianLabelKey(value);

      if (labelKey && valueKey) {
        if (labelKey === 'product.specs.labels.availableInStores') {
          return '';
        }
        return '';
      }

      if (valueKey && !labelKey) {
        if (
          valueKey === 'product.specs.labels.announcementYear' &&
          /\bmonths?\b/i.test(label)
        ) {
          const warrantyLabel = translateSpecLabel(lang, 'product.specs.labels.warranty');
          if (!warrantyLabel) {
            return match;
          }
          return buildSpecRow(warrantyLabel, label);
        }

        if (valueKey === 'product.specs.labels.operatingSystem' && /^\d{4}$/.test(label)) {
          const announcementLabel = translateSpecLabel(lang, 'product.specs.labels.announcementYear');
          if (!announcementLabel) {
            return '';
          }
          return buildSpecRow(announcementLabel, label);
        }

        if (/^\d{4}$/.test(label) && valueKey === 'product.specs.labels.operatingSystem') {
          return '';
        }

        const translatedLabel = translateSpecLabel(lang, valueKey);
        if (!translatedLabel) {
          return match;
        }
        return buildSpecRow(translatedLabel, label);
      }

      if (labelKey) {
        const translatedLabel = translateSpecLabel(lang, labelKey);
        if (!translatedLabel) {
          return match;
        }
        return buildSpecRow(translatedLabel, value);
      }

      const translatedByEnglish = PRODUCT_SPEC_ARMENIAN_LABEL_KEYS.find(([, key]) => {
        const translated = translateSpecLabel(lang, key);
        return translated && translated === label;
      });

      if (translatedByEnglish && valueKey) {
        return '';
      }

      return match;
    },
  );
}

function translateSectionTitles(html: string, lang: LanguageCode | undefined): string {
  return html.replace(
    /<tr class="specs-section specs-section--(\w+)"([^>]*)><td([^>]*)><span class="specs-section-icon"[^>]*><\/span>(?:<span class="specs-section-title">)?[^<]*(?:<\/span>)?<\/td><\/tr>/g,
    (match, slug: string, trRest: string, tdRest: string) => {
      const i18nKey = SECTION_SLUG_TO_I18N_KEY[slug];
      if (!i18nKey) {
        return match;
      }
      const title = t(lang, i18nKey);
      if (title === i18nKey) {
        return match;
      }
      return `<tr class="specs-section specs-section--${slug}"${trRest}><td${tdRest}><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">${escapeHtml(title)}</span></td></tr>`;
    },
  );
}

function translateRemainingArmenianLabels(html: string, lang: LanguageCode | undefined): string {
  let result = html;

  for (const [armenianLabel, i18nKey] of PRODUCT_SPEC_ARMENIAN_LABEL_KEYS) {
    const translated = translateSpecLabel(lang, i18nKey);
    if (!translated) {
      continue;
    }
    const escapedArmenian = escapeHtml(armenianLabel);
    const escapedTranslated = escapeHtml(translated);
    result = result.split(`<td class="spec-label">${escapedArmenian}</td>`).join(`<td class="spec-label">${escapedTranslated}</td>`);
    result = result.split(`<td class="spec-label">${armenianLabel}</td>`).join(`<td class="spec-label">${escapedTranslated}</td>`);
    result = result.split(`<td class="spec-value">${escapedArmenian}</td>`).join(`<td class="spec-value">${escapedTranslated}</td>`);
    result = result.split(`<td class="spec-value">${armenianLabel}</td>`).join(`<td class="spec-value">${escapedTranslated}</td>`);
  }

  return result;
}

/**
 * Localizes MobileCentre-imported spec tables inside product description HTML.
 */
export function translateProductSpecsHtml(lang: LanguageCode | undefined, html: string): string {
  if (!html) {
    return html;
  }

  if (!html.includes('product-specs')) {
    return stripProductStatusNoise(html, lang);
  }

  let result = stripProductStatusNoise(html, lang);
  result = repairSpecRows(result, lang);
  result = translateSectionTitles(result, lang);
  result = translateRemainingArmenianLabels(result, lang);
  return result;
}
