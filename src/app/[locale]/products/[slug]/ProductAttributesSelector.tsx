'use client';

import {
  buildColorSwatchStyle,
  getProductColorHex,
  isKnownProductColor,
} from '../../../../lib/product-color-hex.constants';
import type { ReactNode } from 'react';
import { processImageUrl } from '../../../../lib/utils/image-utils';
import { t, getAttributeLabel } from '../../../../lib/i18n';
import type { LanguageCode } from '../../../../lib/language';
import { resolveProductAttributeLabel } from './utils';
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


function resolveSwatchFallbackHex(value: string, label: string): string {
  if (isKnownProductColor(value)) return getProductColorHex(value);
  if (isKnownProductColor(label)) return getProductColorHex(label);
  return getProductColorHex(value);
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
  return resolveProductAttributeLabel(attrKey, language, productAttr?.attribute?.name);
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
const pillButtonClass =
  'inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors';
const colorSwatchButtonClass =
  'inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 transition-all';

function renderColorSwatch({
  value,
  label,
  colors,
  imageUrl,
  isSelected,
  oos,
  onClick,
  ariaLabel,
}: {
  value: string;
  label: string;
  colors?: string[] | null;
  imageUrl?: string | null;
  isSelected: boolean;
  oos: boolean;
  onClick?: () => void;
  ariaLabel: string;
}) {
  const processedImageUrl = imageUrl ? processImageUrl(imageUrl) : null;
  const hasImage = Boolean(processedImageUrl?.trim());
  const fallbackHex = resolveSwatchFallbackHex(value, label);
  const borderClass =
    isSelected ? 'border-admin ring-2 ring-admin/25' : 'border-gray-200 hover:border-gray-400';

  const content = hasImage && processedImageUrl ? (
    <img
      src={processedImageUrl}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
  ) : null;

  const style = hasImage ? undefined : buildColorSwatchStyle(colors, fallbackHex);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={ariaLabel}
        aria-label={ariaLabel}
        className={`${colorSwatchButtonClass} ${borderClass} ${oos ? 'opacity-60' : ''}`}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      title={ariaLabel}
      aria-label={ariaLabel}
      className={`${colorSwatchButtonClass} ${borderClass} ${oos ? 'opacity-60' : ''}`}
      style={style}
    >
      {content}
    </span>
  );
}

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
          const singleValue = attrGroups.length === 1;

          if (singleValue) {
            const only = attrGroups[0];
            if (isColor) {
              const colorLabel = getAttributeLabel(language, attrKey, only.value);
              return (
                <SpecRow key={attrKey} label={label} unavailable={isUnavailable}>
                  {renderColorSwatch({
                    value: only.value,
                    label: only.label,
                    colors: only.colors,
                    imageUrl: only.imageUrl,
                    isSelected: selectedColor === only.value?.toLowerCase().trim(),
                    oos: only.stock <= 0,
                    ariaLabel: colorLabel,
                  })}
                </SpecRow>
              );
            }
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
                <div className="flex flex-wrap gap-2.5">
                  {attrGroups.map((g) => {
                    const isSelected = selectedColor === g.value?.toLowerCase().trim();
                    const colorLabel = getAttributeLabel(language, attrKey, g.value);
                    return (
                      <span key={g.valueId || g.value}>
                        {renderColorSwatch({
                          value: g.value,
                          label: g.label,
                          colors: g.colors,
                          imageUrl: g.imageUrl,
                          isSelected,
                          oos: g.stock <= 0,
                          onClick: () => onColorSelect(g.value),
                          ariaLabel: colorLabel,
                        })}
                      </span>
                    );
                  })}
                </div>
              </SpecRow>
            );
          }

          // Size / storage / SIM / etc. — text pills only (images belong on color swatches).
          if (isSize) {
            return (
              <SpecRow key={attrKey} label={label} unavailable={isUnavailable}>
                <div className="flex flex-wrap gap-2">
                  {attrGroups.map((g) => {
                    const isSelected = selectedSize === g.value.toLowerCase().trim();
                    const oos = g.stock <= 0;
                    return (
                      <button
                        key={g.valueId || g.value}
                        type="button"
                        onClick={() => onSizeSelect(g.value)}
                        className={`${pillButtonClass} ${
                          isSelected ? selectedPillClass : oos ? oosPillClass : idlePillClass
                        }`}
                      >
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
                  const oos = g.stock <= 0;
                  return (
                    <button
                      key={g.valueId || g.value}
                      type="button"
                      onClick={() => onAttributeValueSelect(attrKey, g.valueId || g.value)}
                      className={`${pillButtonClass} ${
                        isSelected ? selectedPillClass : oos ? oosPillClass : idlePillClass
                      }`}
                    >
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
          <div className="flex flex-wrap gap-2.5">
            {colorGroups.map((g) => {
              const isSelected = selectedColor === g.color?.toLowerCase().trim();
              const colorLabel = getAttributeLabel(language, 'color', g.color);
              return (
                <span key={g.color}>
                  {renderColorSwatch({
                    value: g.color,
                    label: g.color,
                    isSelected,
                    oos: g.stock <= 0,
                    onClick: () => onColorSelect(g.color),
                    ariaLabel: colorLabel,
                  })}
                </span>
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
                  className={`${pillButtonClass} ${
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
