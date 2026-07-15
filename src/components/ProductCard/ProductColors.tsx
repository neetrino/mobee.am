'use client';

import { getColorHex } from '../../lib/colorMap';
import { buildColorSwatchStyle } from '../../lib/product-color-hex.constants';
import { resolveProductCardColorLinkValue, type ProductCardColorOption } from './useProductCardColorState';

interface ColorData {
  value: string;
  linkValue?: string;
  imageUrl?: string | null;
  colors?: string[] | null;
}

interface ProductColorsProps {
  colors: Array<string | ColorData>;
  isCompact?: boolean;
  maxVisible?: number;
  interactive?: boolean;
  selectedLinkValue?: string | null;
  onColorSelect?: (color: ProductCardColorOption) => void;
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

/**
 * Component for displaying product color options
 */
export function ProductColors({
  colors,
  isCompact = false,
  maxVisible = 6,
  interactive = false,
  selectedLinkValue = null,
  onColorSelect,
}: ProductColorsProps) {
  if (!colors || colors.length === 0) {
    return null;
  }

  const swatchSizeClass = isCompact ? 'w-4 h-4' : 'w-5 h-5';
  const selectedRingClass = 'ring-2 ring-[#2db2ff] ring-offset-1';
  const orderedColors = orderColorsForDisplay(colors, selectedLinkValue);

  return (
    <div className={`flex items-center gap-1.5 ${isCompact ? 'mb-1' : 'mb-2'} flex-wrap`}>
      {orderedColors.slice(0, maxVisible).map((colorData, index) => {
        const colorOption = toColorOption(colorData);
        const colorValue = colorOption.value;
        const imageUrl = colorOption.imageUrl ?? null;
        const colorsHex = colorOption.colors ?? null;
        const linkValue = resolveProductCardColorLinkValue(colorOption);
        const isSelected = selectedLinkValue === linkValue;

        const fallbackHex = getColorHex(colorValue);
        const swatchStyle = imageUrl
          ? undefined
          : buildColorSwatchStyle(colorsHex, fallbackHex);

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
      {colors.length > maxVisible && (
        <span className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-500`}>
          +{colors.length - maxVisible}
        </span>
      )}
    </div>
  );
}
