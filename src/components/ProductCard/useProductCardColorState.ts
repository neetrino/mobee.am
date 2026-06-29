import { useState, useEffect, useCallback } from 'react';
import { processImageUrl } from '../../lib/utils/image-utils';

export interface ProductCardColorOption {
  value: string;
  linkValue?: string;
  imageUrl?: string | null;
  colors?: string[] | null;
}

export function resolveProductCardColorLinkValue(color: ProductCardColorOption): string {
  return (color.linkValue ?? color.value).trim().toLowerCase();
}

export function useProductCardColorState(
  product: {
    id: string;
    image: string | null;
    displayColor?: string | null;
    colors?: ProductCardColorOption[];
  },
  filterLinkColor: string | null = null,
) {
  const [cardSelectedLinkColor, setCardSelectedLinkColor] = useState<string | null>(null);
  const [cardImageOverride, setCardImageOverride] = useState<string | null>(null);

  useEffect(() => {
    setCardSelectedLinkColor(null);
    setCardImageOverride(null);
  }, [product.id]);

  const effectiveLinkColor =
    cardSelectedLinkColor ?? filterLinkColor ?? product.displayColor ?? null;
  const displayImage = cardImageOverride ?? product.image;
  const colorsInteractive = (product.colors?.length ?? 0) > 1;

  const handleColorSelect = useCallback((color: ProductCardColorOption) => {
    const linkValue = resolveProductCardColorLinkValue(color);
    setCardSelectedLinkColor(linkValue);

    if (color.imageUrl) {
      const processed = processImageUrl(color.imageUrl);
      if (processed) {
        setCardImageOverride(processed);
      }
    }
  }, []);

  return {
    effectiveLinkColor,
    displayImage,
    selectedCardLinkColor: cardSelectedLinkColor,
    colorsInteractive,
    handleColorSelect,
  };
}
