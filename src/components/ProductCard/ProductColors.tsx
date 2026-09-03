'use client';

import { useEffect, useState } from 'react';
import { buildColorSwatchStyle, resolveProductSwatchHexes } from '../../lib/product-color-hex.constants';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../../lib/layout-breakpoints.constants';
import { resolveProductCardColorLinkValue, type ProductCardColorOption } from './useProductCardColorState';

const PRODUCT_COLORS_MOBILE_MAX_VISIBLE = 4;
const PRODUCT_COLORS_DESKTOP_MAX_VISIBLE = 6;

interface ColorData {
  value: string;
  linkValue?: string;
  imageUrl?: string | null;
  colors?: string[] | null;
}

interface ProductColorsProps {
  colors: Array<string | ColorData>;
  isCompact?: boolean;
  /** Desktop max swatches; mobile always shows {@link PRODUCT_COLORS_MOBILE_MAX_VISIBLE}. */
  maxVisible?: number;
  interactive?: boolean;
  selectedLinkValue?: string | null;
  onColorSelect?: (color: ProductCardColorOption) => void;
  /** Horizontal alignment of the swatch row (grid card centers under image). */
  align?: 'start' | 'center';
}

function toColorOption(colorData: string | ColorData): ProductCardColorOption {
  if (typeof colorData === 'string') {
    return { value: colorData };
  }
  return colorData;
}

function orderColorsForDisplay(
  colors: Array<string | ColorData>,
  displayLinkValue: string | null,
): Array<string | ColorData> {
  if (!displayLinkValue || colors.length <= 1) {
    return colors;
  }

  const normalizedDisplay = displayLinkValue.trim().toLowerCase();
  const matchIndex = colors.findIndex((colorData) => {
    const option = toColorOption(colorData);
    return resolveProductCardColorLinkValue(option) === normalizedDisplay;
  });

  if (matchIndex <= 0) {
    return colors;
  }

  const reordered = [...colors];
  const [matchedColor] = reordered.splice(matchIndex, 1);
  reordered.unshift(matchedColor);
  return reordered;
}

function useProductColorsVisibleLimit(desktopMax: number): number {
  const [visibleLimit, setVisibleLimit] = useState(PRODUCT_COLORS_MOBILE_MAX_VISIBLE);

  useEffect(() => {
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const sync = () => {
      setVisibleLimit(mq.matches ? desktopMax : PRODUCT_COLORS_MOBILE_MAX_VISIBLE);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
    };
  }, [desktopMax]);

  return visibleLimit;
}

/**
 * Component for displaying product color options
 */
export function ProductColors({
  colors,
  isCompact = false,
  maxVisible = PRODUCT_COLORS_DESKTOP_MAX_VISIBLE,
  interactive = false,
  selectedLinkValue = null,
  onColorSelect,
  align = 'start',
}: ProductColorsProps) {
  const visibleLimit = useProductColorsVisibleLimit(maxVisible);

  if (!colors || colors.length === 0) {
    return null;
  }

  const swatchSizeClass = isCompact ? 'w-4 h-4' : 'w-5 h-5';
  const selectedRingClass = 'ring-2 ring-[#2db2ff] ring-offset-1';
  const orderedColors = orderColorsForDisplay(colors, selectedLinkValue);
  const rowAlignClass = align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div className={`mb-0 flex flex-nowrap items-center gap-1.5 ${rowAlignClass}`}>
      {orderedColors.slice(0, visibleLimit).map((colorData, index) => {
        const colorOption = toColorOption(colorData);
        const colorValue = colorOption.value;
        const imageUrl = colorOption.imageUrl ?? null;
        const colorsHex = colorOption.colors ?? null;
        const linkValue = resolveProductCardColorLinkValue(colorOption);
        const isSelected = selectedLinkValue === linkValue;

        const hexes = resolveProductSwatchHexes({
          names: [linkValue, colorValue],
          stored: colorsHex,
        });
        const fallbackHex = hexes[0];
        const swatchStyle = imageUrl ? undefined : buildColorSwatchStyle(hexes);

        const swatchContent = imageUrl ? (
          <img
            src={imageUrl}
            alt={colorValue}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const fallbackColor = fallbackHex || '#CCCCCC';
              (e.target as HTMLImageElement).style.background = fallbackColor;
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null;

        if (interactive && onColorSelect) {
          return (
            <button
              key={`${linkValue}-${index}`}
              type="button"
              className={`${swatchSizeClass} rounded-full border border-gray-300 flex-shrink-0 overflow-hidden transition-shadow ${isSelected ? selectedRingClass : 'hover:ring-1 hover:ring-gray-300'}`}
              style={swatchStyle}
              title={colorValue}
              aria-label={`Color: ${colorValue}`}
              aria-pressed={isSelected}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onColorSelect(colorOption);
              }}
            >
              {swatchContent}
            </button>
          );
        }

        return (
          <div
            key={`${linkValue}-${index}`}
            className={`${swatchSizeClass} rounded-full border border-gray-300 flex-shrink-0 overflow-hidden ${isSelected ? selectedRingClass : ''}`}
            style={swatchStyle}
            title={colorValue}
            aria-label={`Color: ${colorValue}`}
            aria-current={isSelected ? 'true' : undefined}
          >
            {swatchContent}
          </div>
        );
      })}
      {colors.length > visibleLimit && (
        <span className={`shrink-0 whitespace-nowrap ${isCompact ? 'text-xs' : 'text-sm'} text-gray-500`}>
          +{colors.length - visibleLimit}
        </span>
      )}
    </div>
  );
}
