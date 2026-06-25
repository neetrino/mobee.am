'use client';

import { getProductColorHex, isKnownProductColor } from '../../../lib/product-color-hex.constants';
import type { ReactNode } from 'react';
import { processImageUrl } from '../../../lib/utils/image-utils';
import { t, getAttributeLabel } from '../../../lib/i18n';
import type { LanguageCode } from '../../../lib/language';
import type {
  AttributeGroupValue,
  Product,
  ProductAttribute,
  ProductVariant,
  VariantOption,
} from './types';

export interface ProductAttributesSelectorProps {
  product: Product;
  attributeGroups: Map<string, AttributeGroupValue[]>;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedAttributeValues: Map<string, string>;
  unavailableAttributes: Map<string, boolean>;
  colorGroups: Array<{ color: string; stock: number; variants: ProductVariant[] }>;
  sizeGroups: Array<{ size: string; stock: number; variants: ProductVariant[] }>;
  language: LanguageCode;
  onColorSelect: (color: string) => void;
  onSizeSelect: (size: string) => void;
  onAttributeValueSelect: (attrKey: string, value: string) => void;
  getOptionValue: (options: VariantOption[] | undefined, key: string) => string | null;
}

const getColorValue = (colorName: string): string => getProductColorHex(colorName);

function resolveSwatchHex(value: string, label: string, colors?: string[] | null): string {
  if (colors?.length) return colors[0];
  if (isKnownProductColor(value)) return getProductColorHex(value);
  if (isKnownProductColor(label)) return getProductColorHex(label);
  return getProductColorHex(value);
}

function swatchNeedsBorder(hex: string): boolean {
  const normalized = hex.toLowerCase();
  return normalized === '#ffffff' || normalized === '#f0f0f0' || normalized === '#f5f5f7' || normalized === '#f6f2ef';
}

function sortAttributeEntries(
  entries: Array<[string, AttributeGroupValue[]]>
): Array<[string, AttributeGroupValue[]]> {
  return [...entries].sort(([a], [b]) => {
    const colorKeys = ['color', 'colour'];
    if (colorKeys.includes(a)) return 1;
    if (colorKeys.includes(b)) return -1;
    return 0;
  });
}

function resolveAttributeLabel(
  product: Product,
  attrKey: string,
  language: LanguageCode
): string {
  const productAttr = product.productAttributes?.find((pa: ProductAttribute) => pa.attribute?.key === attrKey);
  const name = productAttr?.attribute?.name;
  if (name) return name;
  if (attrKey === 'color') return t(language, 'product.color');
  if (attrKey === 'size') return t(language, 'product.size');
  return attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
}

function SpecRow({
  label,
  unavailable,
  children,
}: {
  label: string;
  unavailable: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,10rem)_1fr] gap-x-6 gap-y-2 py-4 border-b border-gray-200 last:border-b-0">
      <div className={`text-sm text-gray-700 ${unavailable ? 'text-red-600' : ''}`}>{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const selectedPillClass = 'border-admin bg-admin-50 text-gray-900';
const idlePillClass = 'border-gray-200 text-gray-900 hover:border-gray-400';
const oosPillClass = 'border-gray-200 text-gray-400 line-through opacity-80';
const COLOR_SWATCH_BUTTON_CLASS =
  'h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 transition-all';
const COLOR_SWATCH_ROW_CLASS = 'flex flex-wrap justify-end gap-2.5';

export function ProductAttributesSelector({
  product,
  attributeGroups,
  selectedColor,
  selectedSize,
  selectedAttributeValues,
  unavailableAttributes,
  colorGroups,
  sizeGroups,
  language,
  onColorSelect,
  onSizeSelect,
  onAttributeValueSelect,
  getOptionValue,
}: ProductAttributesSelectorProps) {
  const entries = sortAttributeEntries(Array.from(attributeGroups.entries()));

  if (entries.length > 0) {
    return (
      <div>
        {entries.map(([attrKey, attrGroups]) => {
          if (attrGroups.length === 0) return null;
          const label = resolveAttributeLabel(product, attrKey, language);
          const isUnavailable = unavailableAttributes.get(attrKey) ?? false;
          const isColor = attrKey === 'color' || attrKey === 'colour';
          const isSize = attrKey === 'size';
          const singleValue = attrGroups.length === 1 && !isColor;

          if (singleValue) {
            const only = attrGroups[0];
            return (
              <SpecRow key={attrKey} label={label} unavailable={isUnavailable}>
                <span className="text-sm font-medium text-gray-900">
                  {getAttributeLabel(language, attrKey, only.value)}
                </span>
              </SpecRow>
            );
          }

          if (isColor) {
            return (
              <SpecRow key={attrKey} label={label} unavailable={isUnavailable}>
                <div className={COLOR_SWATCH_ROW_CLASS}>
                  {attrGroups.map((g) => {
                    const isSelected = selectedColor === g.value?.toLowerCase().trim();
                    const processedImageUrl = g.imageUrl ? processImageUrl(g.imageUrl) : null;
                    const hasImage = Boolean(processedImageUrl?.trim());
                    const colorHex = resolveSwatchHex(g.value, g.label, g.colors);
                    const borderClass = swatchNeedsBorder(colorHex) ? 'border-gray-300' : '';
                    return (
                      <button
                        key={g.valueId || g.value}
                        type="button"
                        onClick={() => onColorSelect(g.value)}
                        title={getAttributeLabel(language, attrKey, g.value)}
                        className={`${COLOR_SWATCH_BUTTON_CLASS} ${borderClass} ${
                          isSelected ? 'border-admin ring-2 ring-admin/25' : 'border-gray-200 hover:border-gray-400'
                        } ${g.stock <= 0 ? 'opacity-60' : ''}`}
                        style={hasImage ? undefined : { backgroundColor: colorHex }}
                      >
                        {hasImage && processedImageUrl ? (
                           
                          <img
                            src={processedImageUrl}
                            alt={g.label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </SpecRow>
            );
          }

          if (isSize) {
            return (
              <SpecRow key={attrKey} label={label} unavailable={isUnavailable}>
                <div className="flex flex-wrap gap-2">
                  {attrGroups.map((g) => {
                    const isSelected = selectedSize === g.value.toLowerCase().trim();
                    const processedImageUrl = g.imageUrl ? processImageUrl(g.imageUrl) : null;
                    const hasImage = Boolean(processedImageUrl?.trim());
                    const oos = g.stock <= 0;
                    return (
                      <button
                        key={g.valueId || g.value}
                        type="button"
                        onClick={() => onSizeSelect(g.value)}
                        className={`inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
                          isSelected ? selectedPillClass : oos ? oosPillClass : idlePillClass
                        }`}
                      >
                        {hasImage && processedImageUrl ? (
                           
                          <img
                            src={processedImageUrl}
                            alt=""
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : null}
                        <span>{getAttributeLabel(language, attrKey, g.value)}</span>
                      </button>
                    );
                  })}
                </div>
              </SpecRow>
            );
          }

          return (
            <SpecRow key={attrKey} label={label} unavailable={isUnavailable}>
              <div className="flex flex-wrap gap-2">
                {attrGroups.map((g) => {
                  const selectedValue = selectedAttributeValues.get(attrKey);
                  const optionValue = g.valueId || g.value;
                  const isSelected = selectedValue === optionValue || selectedValue === g.value;
                  const processedImageUrl = g.imageUrl ? processImageUrl(g.imageUrl) : null;
                  const hasImage = Boolean(processedImageUrl?.trim());
                  const hasColors = Boolean(g.colors?.length);
                  const colorHex = hasColors && g.colors ? g.colors[0] : null;
                  const oos = g.stock <= 0;
                  return (
                    <button
                      key={g.valueId || g.value}
                      type="button"
                      onClick={() => onAttributeValueSelect(attrKey, g.valueId || g.value)}
                      className={`inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
                        isSelected ? selectedPillClass : oos ? oosPillClass : idlePillClass
                      }`}
                      style={!hasImage && colorHex ? { backgroundColor: colorHex } : undefined}
                    >
                      {hasImage && processedImageUrl ? (
                         
                        <img
                          src={processedImageUrl}
                          alt=""
                          className="h-6 w-6 rounded object-cover"
                        />
                      ) : hasColors && colorHex ? (
                        <span className="h-6 w-6 shrink-0 rounded-full border border-gray-300" style={{ backgroundColor: colorHex }} />
                      ) : null}
                      <span>{getAttributeLabel(language, attrKey, g.value)}</span>
                    </button>
                  );
                })}
              </div>
            </SpecRow>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {colorGroups.length > 0 && (
        <SpecRow label={t(language, 'product.color')} unavailable={false}>
          <div className={COLOR_SWATCH_ROW_CLASS}>
            {colorGroups.map((g) => {
              const isSelected = selectedColor === g.color?.toLowerCase().trim();
              const oos = g.stock <= 0;
              return (
                <button
                  key={g.color}
                  type="button"
                  onClick={() => onColorSelect(g.color)}
                  title={getAttributeLabel(language, 'color', g.color)}
                  className={`${COLOR_SWATCH_BUTTON_CLASS} ${
                    isSelected ? 'border-admin ring-2 ring-admin/25' : 'border-gray-200 hover:border-gray-400'
                  } ${oos ? 'opacity-60' : ''}`}
                  style={{ backgroundColor: getColorValue(g.color) }}
                />
              );
            })}
          </div>
        </SpecRow>
      )}

      {!product?.productAttributes && sizeGroups.length > 0 && (
        <SpecRow label={t(language, 'product.size')} unavailable={false}>
          <div className="flex flex-wrap gap-2">
            {sizeGroups.map((g) => {
              let displayStock = g.stock;
              if (selectedColor) {
                const match = g.variants.find((v) => {
                  const colorOpt = getOptionValue(v.options, 'color');
                  return colorOpt === selectedColor.toLowerCase().trim();
                });
                displayStock = match ? match.stock : 0;
              }
              const isSelected = selectedSize === g.size;
              const oos = displayStock <= 0;
              return (
                <button
                  key={g.size}
                  type="button"
                  onClick={() => onSizeSelect(g.size)}
                  className={`inline-flex min-h-[2.5rem] items-center rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected ? selectedPillClass : oos ? oosPillClass : idlePillClass
                  }`}
                >
                  {getAttributeLabel(language, 'size', g.size)}
                </button>
              );
            })}
          </div>
        </SpecRow>
      )}
    </div>
  );
}
