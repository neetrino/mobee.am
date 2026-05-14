'use client';

import type { MouseEvent } from 'react';
import { FileText, Heart } from 'lucide-react';
import { formatPrice, type CurrencyCode } from '../../../lib/currency';
import { t, getProductText } from '../../../lib/i18n';
import type { LanguageCode } from '../../../lib/language';
import { CompareIcon } from '../../../components/icons/CompareIcon';
import { ProductAttributesSelector } from './ProductAttributesSelector';
import type { AttributeGroupValue, Product, ProductVariant, VariantOption } from './types';
import { formatProductVariantIdsForDisplay } from './productDisplayIds';

interface ProductInfoAndActionsProps {
  product: Product;
  price: number;
  discountPercent: number | null;
  currency: string;
  language: LanguageCode;
  quantity: number;
  maxQuantity: number;
  isOutOfStock: boolean;
  isVariationRequired: boolean;
  hasUnavailableAttributes: boolean;
  unavailableAttributes: Map<string, boolean>;
  canAddToCart: boolean;
  isInWishlist: boolean;
  isInCompare: boolean;
  showMessage: string | null;
  currentVariant: ProductVariant | null;
  attributeGroups: Map<string, AttributeGroupValue[]>;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedAttributeValues: Map<string, string>;
  colorGroups: Array<{ color: string; stock: number; variants: ProductVariant[] }>;
  sizeGroups: Array<{ size: string; stock: number; variants: ProductVariant[] }>;
  onQuantityAdjust: (delta: number) => void;
  onAddToCart: () => void;
  onAddToWishlist: (e: MouseEvent) => void;
  onCompareToggle: (e: MouseEvent) => void;
  onScrollToDetails: () => void;
  onColorSelect: (color: string) => void;
  onSizeSelect: (size: string) => void;
  onAttributeValueSelect: (attrKey: string, value: string) => void;
  getOptionValue: (options: VariantOption[] | undefined, key: string) => string | null;
  getRequiredAttributesMessage: () => string;
}

export function ProductInfoAndActions({
  product,
  price,
  discountPercent,
  currency,
  language,
  quantity,
  maxQuantity,
  isOutOfStock,
  isVariationRequired,
  hasUnavailableAttributes,
  unavailableAttributes,
  canAddToCart,
  isInWishlist,
  isInCompare,
  showMessage,
  currentVariant,
  attributeGroups,
  selectedColor,
  selectedSize,
  selectedAttributeValues,
  colorGroups,
  sizeGroups,
  onQuantityAdjust,
  onAddToCart,
  onAddToWishlist,
  onCompareToggle,
  onScrollToDetails,
  onColorSelect,
  onSizeSelect,
  onAttributeValueSelect,
  getOptionValue,
  getRequiredAttributesMessage,
}: ProductInfoAndActionsProps) {
  const title = getProductText(language, product.id, 'title') || product.title;
  const listingIds = formatProductVariantIdsForDisplay(product);

  return (
    <div className="flex flex-col">
      {product.brand && <p className="mb-1 text-sm text-gray-500">{product.brand.name}</p>}
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">{title}</h1>

      <div className="mt-3">
        <p className="text-sm text-gray-600">
          ID: {listingIds}
          {currentVariant?.sku ? ` · SKU: ${currentVariant.sku}` : ''}
        </p>
      </div>

      <hr className="my-5 border-0 border-t border-gray-200" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="flex h-11 min-w-[8.5rem] select-none items-stretch overflow-hidden rounded-[15px] border border-gray-200 bg-white px-0.5"
          role="group"
          aria-label={t(language, 'product.quantity')}
        >
          <button
            type="button"
            onClick={() => onQuantityAdjust(-1)}
            disabled={quantity <= 1}
            className="flex min-w-9 flex-1 cursor-pointer items-center justify-center text-lg font-normal leading-none text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
            aria-label={t(language, 'common.ariaLabels.decreaseQuantity')}
          >
            −
          </button>
          <span className="flex min-w-[2rem] items-center justify-center px-2 text-base font-bold tabular-nums leading-none text-gray-900">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityAdjust(1)}
            disabled={quantity >= maxQuantity || maxQuantity <= 0}
            className="flex min-w-9 flex-1 cursor-pointer items-center justify-center text-lg font-normal leading-none text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
            aria-label={t(language, 'common.ariaLabels.increaseQuantity')}
          >
            +
          </button>
        </div>

        <div className="flex flex-wrap items-baseline justify-end gap-2 text-right">
          <span className="text-xl font-bold text-gray-900 sm:text-2xl">
            {formatPrice(price, currency as CurrencyCode)}
          </span>
          {discountPercent != null && discountPercent > 0 && (
            <span className="text-sm font-semibold text-admin">-{discountPercent}%</span>
          )}
        </div>
      </div>

      <hr className="my-5 border-0 border-t border-gray-200" />

      {isVariationRequired && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">{getRequiredAttributesMessage()}</p>
        </div>
      )}
      {hasUnavailableAttributes && !isVariationRequired && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            {Array.from(unavailableAttributes.entries())
              .map(([attrKey]) => {
                const productAttr = product.productAttributes?.find((pa) => pa.attribute?.key === attrKey);
                const attributeName =
                  productAttr?.attribute?.name || attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
                if (attrKey === 'color') return t(language, 'product.color');
                if (attrKey === 'size') return t(language, 'product.size');
                return attributeName;
              })
              .join(', ')}{' '}
            {t(language, 'product.outOfStock')}
          </p>
        </div>
      )}

      <ProductAttributesSelector
        product={product}
        attributeGroups={attributeGroups}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        selectedAttributeValues={selectedAttributeValues}
        unavailableAttributes={unavailableAttributes}
        colorGroups={colorGroups}
        sizeGroups={sizeGroups}
        language={language}
        onColorSelect={onColorSelect}
        onSizeSelect={onSizeSelect}
        onAttributeValueSelect={onAttributeValueSelect}
        getOptionValue={getOptionValue}
      />

      <div className="mt-8 flex flex-col gap-3 text-sm">
        <button
          type="button"
          onClick={onScrollToDetails}
          className="inline-flex w-fit items-center gap-2 font-medium text-admin hover:underline"
        >
          <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
          {t(language, 'product.moreDetails')}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          disabled={!canAddToCart}
          className="h-12 min-w-[12rem] flex-1 cursor-pointer rounded-xl bg-admin px-4 font-bold uppercase tracking-wide text-white transition-colors hover:bg-admin-600 disabled:cursor-default disabled:bg-gray-300"
          onClick={onAddToCart}
        >
          {isOutOfStock
            ? t(language, 'product.outOfStock')
            : isVariationRequired
              ? getRequiredAttributesMessage()
              : hasUnavailableAttributes
                ? t(language, 'product.outOfStock')
                : t(language, 'product.addToCart')}
        </button>
        <button
          type="button"
          onClick={onCompareToggle}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-white transition-colors duration-200 ${
            isInCompare
              ? 'border-admin text-admin'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
          aria-label={t(language, 'common.navigation.compare')}
        >
          <CompareIcon size={20} strokeWidth={1.75} className="shrink-0" />
        </button>
        <button
          type="button"
          onClick={onAddToWishlist}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-white transition-colors duration-200 ${
            isInWishlist
              ? 'border-admin text-admin'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
          aria-label={t(language, 'common.buttons.addToWishlist')}
        >
          <Heart className="h-5 w-5" fill={isInWishlist ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </div>

      {showMessage && (
        <div className="mt-4 rounded-md bg-gray-900 p-4 text-white shadow-lg">{showMessage}</div>
      )}
    </div>
  );
}
