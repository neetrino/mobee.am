import type { VariantOption } from './types';
import { t } from '../../../../lib/i18n';
import type { LanguageCode } from '../../../../lib/language';

/**
 * Helper function to get color hex/rgb from color name
 */
export const getColorValue = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'beige': '#F5F5DC', 'black': '#000000', 'blue': '#0000FF', 'brown': '#A52A2A',
    'gray': '#808080', 'grey': '#808080', 'green': '#008000', 'red': '#FF0000',
    'white': '#FFFFFF', 'yellow': '#FFFF00', 'orange': '#FFA500', 'pink': '#FFC0CB',
    'purple': '#800080', 'navy': '#000080', 'maroon': '#800000', 'olive': '#808000',
    'teal': '#008080', 'cyan': '#00FFFF', 'magenta': '#FF00FF', 'lime': '#00FF00',
    'silver': '#C0C0C0', 'gold': '#FFD700',
  };
  const normalizedName = colorName.toLowerCase().trim();
  return colorMap[normalizedName] || '#CCCCCC';
};

/**
 * Helper function to get option value (supports both new and old format)
 */
export const getOptionValue = (options: VariantOption[] | undefined, key: string): string | null => {
  if (!options) return null;
  const opt = options.find(o => o.key === key || o.attribute === key);
  return opt?.value?.toLowerCase().trim() || null;
};

const ATTRIBUTE_LABEL_I18N_KEYS: Record<string, string> = {
  color: 'product.color',
  colour: 'product.color',
  size: 'product.size',
  storage: 'product.storage',
  memory: 'product.storage',
};

/**
 * Localized attribute row label. Prefers i18n for known keys so DB English
 * names (e.g. "Storage") do not leak into hy/ru UI.
 */
export function resolveProductAttributeLabel(
  attrKey: string,
  language: LanguageCode,
  fallbackName?: string | null,
): string {
  const i18nKey = ATTRIBUTE_LABEL_I18N_KEYS[attrKey.toLowerCase()];
  if (i18nKey) {
    const translated = t(language, i18nKey);
    if (translated && translated !== i18nKey) {
      return translated;
    }
  }
  if (fallbackName?.trim()) {
    return fallbackName;
  }
  return attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
}
