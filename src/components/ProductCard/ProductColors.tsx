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
}

/**
 * Component for displaying product color options
 */
export function ProductColors({ colors, isCompact = false, maxVisible = 6 }: ProductColorsProps) {
  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 ${isCompact ? 'mb-1' : 'mb-2'} flex-wrap`}>
      {colors.slice(0, maxVisible).map((colorData, index) => {
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
                className="w-full h-full object-cover"
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




