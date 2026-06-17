'use client';

import { getColorHex } from '../../lib/colorMap';

interface ColorData {
  value: string;
  imageUrl?: string | null;
  colors?: string[] | null;
}

interface ProductColorsProps {
  colors: Array<string | ColorData>;
  isCompact?: boolean;
  maxVisible?: number;
  /** Home mobile Figma — overlapping swatches with blue ring on first color. */
  homeProductGridCard?: boolean;
}

/**
 * Component for displaying product color options
 */
export function ProductColors({
  colors,
  isCompact = false,
  maxVisible = 6,
  homeProductGridCard = false,
}: ProductColorsProps) {
  if (!colors || colors.length === 0) {
    return null;
  }

  const visibleColors = colors.slice(0, maxVisible);

  if (homeProductGridCard) {
    return (
      <div className="mb-0 flex items-center max-lg:mb-0 lg:mb-2">
        {visibleColors.map((colorData, index) => {
          const colorValue = typeof colorData === 'string' ? colorData : colorData.value;
          const imageUrl = typeof colorData === 'object' ? colorData.imageUrl : null;
          const colorsHex = typeof colorData === 'object' ? colorData.colors : null;
          const colorHex =
            colorsHex && Array.isArray(colorsHex) && colorsHex.length > 0
              ? colorsHex[0]
              : getColorHex(colorValue);

          return (
            <div
              key={index}
              className={`relative size-5 shrink-0 overflow-hidden rounded-full border-2 bg-white ${
                index === 0 ? 'border-[#2db2ff]' : 'border-white'
              } ${index > 0 ? '-ml-1.5' : ''}`}
              style={{ zIndex: visibleColors.length - index }}
              title={colorValue}
              aria-label={`Color: ${colorValue}`}
            >
              <div
                className="size-full rounded-full"
                style={imageUrl ? undefined : { backgroundColor: colorHex }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={colorValue}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
        {colors.length > maxVisible ? (
          <span className="ml-1.5 text-xs text-gray-500">+{colors.length - maxVisible}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${isCompact ? 'mb-1' : 'mb-2'} flex-wrap`}>
      {visibleColors.map((colorData, index) => {
        const colorValue = typeof colorData === 'string' ? colorData : colorData.value;
        const imageUrl = typeof colorData === 'object' ? colorData.imageUrl : null;
        const colorsHex = typeof colorData === 'object' ? colorData.colors : null;
        
        // Determine color hex: use colorsHex[0] if available, otherwise use getColorHex
        const colorHex = colorsHex && Array.isArray(colorsHex) && colorsHex.length > 0 
          ? colorsHex[0] 
          : getColorHex(colorValue);
        
        return (
          <div
            key={index}
            className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} rounded-full border border-gray-300 flex-shrink-0 overflow-hidden`}
            style={imageUrl ? {} : { backgroundColor: colorHex }}
            title={colorValue}
            aria-label={`Color: ${colorValue}`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={colorValue}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  // Fallback to color hex if image fails to load
                  const fallbackColor = colorHex || '#CCCCCC';
                  (e.target as HTMLImageElement).style.backgroundColor = fallbackColor;
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
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




