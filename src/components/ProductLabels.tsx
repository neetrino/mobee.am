'use client';

import React from 'react';
import {
  getProductLabelDisplayI18nKey,
  resolveKnownProductLabelKind,
  shouldHideOutOfStockProductLabel,
} from '../lib/product-label-display.constants';
import { useTranslation } from '../lib/i18n-client';

export type ProductLabelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ProductLabel {
  id: string;
  type: 'text' | 'percentage';
  value: string;
  position: ProductLabelPosition;
  color: string | null;
}

interface ProductLabelsProps {
  labels: ProductLabel[];
  /** Product card Figma badges (pill «ՆՈՐ» etc.). */
  variant?: 'default' | 'productCard';
}

/**
 * Corner badges on product cards — known labels (New / Sale / Hot) follow the UI language.
 */
export const ProductLabels: React.FC<ProductLabelsProps> = ({ labels, variant = 'default' }) => {
  const { t } = useTranslation();
  const visibleLabels = labels.filter((label) => !shouldHideOutOfStockProductLabel(label));
  if (visibleLabels.length === 0) return null;

  const positions: ProductLabelPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const isProductCard = variant === 'productCard';

  const getColorClasses = (label: ProductLabel) => {
    if (label.color) {
      return '';
    }

    if (label.type === 'percentage') {
      return 'bg-red-600 text-white';
    }

    const kind = resolveKnownProductLabelKind(label.value);
    if (kind === 'new') {
      return isProductCard ? 'bg-[#2db2ff] text-white' : 'bg-green-600 text-white';
    }
    if (kind === 'hot') {
      return 'bg-orange-600 text-white';
    }
    if (kind === 'sale') {
      return 'bg-red-600 text-white';
    }

    return 'bg-blue-600 text-white';
  };

  const getCornerPositionClasses = (position: ProductLabelPosition) => {
    if (isProductCard) {
      switch (position) {
        case 'top-left':
          return 'top-[12.5px] left-[11px] items-start';
        case 'top-right':
          return 'top-3 right-3 items-end';
        case 'bottom-left':
          return 'bottom-2 left-2 items-start';
        case 'bottom-right':
          return 'bottom-2 right-2 items-end';
        default:
          return '';
      }
    }

    switch (position) {
      case 'top-left':
        return 'top-2 left-2 items-start';
      case 'top-right':
        return 'top-2 right-2 items-end';
      case 'bottom-left':
        return 'bottom-2 left-2 items-start';
      case 'bottom-right':
        return 'bottom-2 right-2 items-end';
      default:
        return '';
    }
  };

  const resolveLabelText = (label: ProductLabel): string => {
    if (label.type === 'percentage') {
      return `${label.value}%`;
    }

    const i18nKey = getProductLabelDisplayI18nKey(label.value);
    return i18nKey ? t(i18nKey) : label.value;
  };

  const badgeClass = isProductCard
    ? 'inline-flex min-w-[57px] items-center justify-center rounded-[24px] px-2 py-[2.5px] text-xs font-bold uppercase leading-[15px] text-white'
    : 'px-2 py-0.5 text-[10px] font-semibold rounded-md shadow-sm';

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {positions.map((position) => {
        const labelsForPosition = visibleLabels.filter((label) => label.position === position);
        if (labelsForPosition.length === 0) return null;

        return (
          <div
            key={position}
            className={`absolute flex flex-col gap-1 ${getCornerPositionClasses(position)}`}
          >
            {labelsForPosition.map((label) => (
              <div
                key={label.id}
                className={`pointer-events-auto ${badgeClass} ${getColorClasses(label)}`}
                style={label.color ? { backgroundColor: label.color, color: 'white' } : undefined}
              >
                {resolveLabelText(label)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
