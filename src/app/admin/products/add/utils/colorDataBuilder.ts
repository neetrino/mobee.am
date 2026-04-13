/**
 * Utilities for building color data map from variants
 */

import { convertPrice, type CurrencyCode } from '@/lib/currency';
import { smartSplitUrls } from '@/lib/utils/image-utils';
import type { ColorData } from '../types';

interface Variant {
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  stock?: number | null;
  imageUrl?: string;
  isFeatured?: boolean;
  sizeLabel?: string;
}

interface Attribute {
  key: string;
  values: Array<{
    id: string;
    value: string;
    label: string;
  }>;
}

/**
 * Converts price to default currency
 */
function convertPriceToDefaultCurrency(
  price: number | string | null | undefined,
  defaultCurrency: CurrencyCode
): number {
  if (price === undefined || price === null) {
    return 0;
  }
  const priceNum = typeof price === 'number' ? price : parseFloat(String(price || '0'));
  return convertPrice(priceNum, 'USD', defaultCurrency);
}

/**
 * Checks if image URL already exists in images array
 */
function imageExists(images: string[], url: string): boolean {
  return images.some((existingUrl) => {
    if (url.startsWith('data:') || existingUrl.startsWith('data:')) {
      return url === existingUrl;
    }
    const n1 = existingUrl.startsWith('/') ? existingUrl : `/${existingUrl}`;
    const n2 = url.startsWith('/') ? url : `/${url}`;
    return n1 === n2 || existingUrl === url;
  });
}

/**
 * Adds images to existing color data
 */
function addImagesToColorData(colorData: ColorData, imageUrl: string | undefined): void {
  if (!imageUrl) {
    return;
  }

  const imageUrls = smartSplitUrls(imageUrl);
  imageUrls.forEach((url: string) => {
    if (url && !imageExists(colorData.images, url)) {
      colorData.images.push(url);
    }
  });
}

/**
 * Creates default color data
 */
export function createDefaultColorData(
  variant: Variant,
  defaultCurrency: CurrencyCode,
  defaultColorLabel: string,
  size: string,
  stockValue: string
): ColorData {
  const priceInDefaultCurrency = convertPriceToDefaultCurrency(variant.price, defaultCurrency);
  const compareAtPriceInDefaultCurrency = convertPriceToDefaultCurrency(
    variant.compareAtPrice,
    defaultCurrency
  );

  const colorData: ColorData = {
    colorValue: 'default',
    colorLabel: defaultColorLabel,
    images: smartSplitUrls(variant.imageUrl),
    stock: size ? '' : stockValue,
    price: variant.price !== undefined && variant.price !== null ? String(priceInDefaultCurrency) : '',
    compareAtPrice:
      variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
        ? String(compareAtPriceInDefaultCurrency)
        : '',
    sizes: [],
    sizeStocks: {},
    sizePrices: {},
    sizeCompareAtPrices: {},
    sizeLabels: {},
    isFeatured: !!variant.isFeatured,
  };

  if (size) {
    colorData.sizes = [size];
    colorData.sizeStocks = { [size]: stockValue };
    if (variant.price !== undefined && variant.price !== null) {
      colorData.sizePrices![size] = String(priceInDefaultCurrency);
    }
    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
      colorData.sizeCompareAtPrices![size] = String(compareAtPriceInDefaultCurrency);
    }
  }

  return colorData;
}

/**
 * Updates existing default color data with new variant
 */
export function updateDefaultColorData(
  colorData: ColorData,
  variant: Variant,
  defaultCurrency: CurrencyCode,
  size: string,
  stockValue: string
): void {
  addImagesToColorData(colorData, variant.imageUrl);

  if (size) {
    if (!colorData.sizes.includes(size)) {
      colorData.sizes.push(size);
    }
    colorData.sizeStocks[size] = stockValue;
    if (!colorData.sizePrices) {
      colorData.sizePrices = {};
    }
    if (variant.price !== undefined && variant.price !== null) {
      const priceInDefaultCurrency = convertPriceToDefaultCurrency(variant.price, defaultCurrency);
      colorData.sizePrices[size] = String(priceInDefaultCurrency);
    }
    if (!colorData.sizeCompareAtPrices) {
      colorData.sizeCompareAtPrices = {};
    }
    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
      const compareAtPriceInDefaultCurrency = convertPriceToDefaultCurrency(
        variant.compareAtPrice,
        defaultCurrency
      );
      colorData.sizeCompareAtPrices[size] = String(compareAtPriceInDefaultCurrency);
    }
  } else {
    const currentStockNum = parseInt(colorData.stock) || 0;
    const variantStockNum = parseInt(stockValue) || 0;
    colorData.stock = String(currentStockNum + variantStockNum);
  }
}

/**
 * Creates color data for a specific color
 */
export function createColorData(
  variant: Variant,
  color: string,
  attributes: Attribute[],
  defaultCurrency: CurrencyCode,
  size: string,
  stockValue: string
): ColorData {
  const colorAttribute = attributes.find((attr) => attr.key === 'color');
  const colorValueObj = colorAttribute?.values.find((v) => v.value === color);
  const colorLabel =
    colorValueObj?.label || (color.charAt(0).toUpperCase() + color.slice(1).replace(/-/g, ' '));

  const priceInDefaultCurrency = convertPriceToDefaultCurrency(variant.price, defaultCurrency);
  const compareAtPriceInDefaultCurrency = convertPriceToDefaultCurrency(
    variant.compareAtPrice,
    defaultCurrency
  );

  const colorData: ColorData = {
    colorValue: color,
    colorLabel: colorLabel,
    images: smartSplitUrls(variant.imageUrl),
    stock: size ? '' : stockValue,
    price: variant.price !== undefined && variant.price !== null ? String(priceInDefaultCurrency) : '',
    compareAtPrice:
      variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
        ? String(compareAtPriceInDefaultCurrency)
        : '',
    sizes: [],
    sizeStocks: {},
    sizePrices: {},
    sizeCompareAtPrices: {},
    sizeLabels: {},
    isFeatured: !!variant.isFeatured,
  };

  if (size) {
    colorData.sizes = [size];
    colorData.sizeStocks = { [size]: stockValue };
    if (variant.price !== undefined && variant.price !== null) {
      colorData.sizePrices![size] = String(priceInDefaultCurrency);
    }
    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
      colorData.sizeCompareAtPrices![size] = String(compareAtPriceInDefaultCurrency);
    }
    if (variant.sizeLabel) {
      colorData.sizeLabels = { [size]: variant.sizeLabel };
    }
  }

  return colorData;
}

/**
 * Updates existing color data with new variant
 */
export function updateColorData(
  colorData: ColorData,
  variant: Variant,
  defaultCurrency: CurrencyCode,
  size: string,
  stockValue: string
): void {
  addImagesToColorData(colorData, variant.imageUrl);

  if (size) {
    if (!colorData.sizes.includes(size)) {
      colorData.sizes.push(size);
    }
    colorData.sizeStocks[size] = stockValue;
    if (!colorData.sizePrices) {
      colorData.sizePrices = {};
    }
    if (variant.price !== undefined && variant.price !== null) {
      const priceInDefaultCurrency = convertPriceToDefaultCurrency(variant.price, defaultCurrency);
      colorData.sizePrices[size] = String(priceInDefaultCurrency);
    }
    if (!colorData.sizeCompareAtPrices) {
      colorData.sizeCompareAtPrices = {};
    }
    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
      const compareAtPriceInDefaultCurrency = convertPriceToDefaultCurrency(
        variant.compareAtPrice,
        defaultCurrency
      );
      colorData.sizeCompareAtPrices[size] = String(compareAtPriceInDefaultCurrency);
    }
    if (variant.sizeLabel) {
      if (!colorData.sizeLabels) {
        colorData.sizeLabels = {};
      }
      colorData.sizeLabels[size] = variant.sizeLabel;
    }
  } else {
    const currentStockNum = parseInt(colorData.stock) || 0;
    const variantStockNum = parseInt(stockValue) || 0;
    colorData.stock = String(currentStockNum + variantStockNum);
  }

  if (variant.isFeatured) {
    colorData.isFeatured = true;
  }
}

