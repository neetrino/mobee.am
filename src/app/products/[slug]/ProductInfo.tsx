'use client';

import { formatPrice } from '../../../lib/currency';
import type { CurrencyCode } from '../../../lib/currency';
import { getProductText } from '../../../lib/i18n';
import type { LanguageCode } from '../../../lib/language';
import { sanitizeHtml } from '../../../lib/utils/sanitize';
import type { Product } from './types';

interface ProductInfoProps {
  product: Product;
  price: number;
  discountPercent: number | null;
  currency: CurrencyCode;
  language: LanguageCode;
}

export function ProductInfo({
  product,
  price,
  discountPercent,
  currency,
  language,
}: ProductInfoProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        {product.brand && <p className="text-sm text-gray-500 mb-2">{product.brand.name}</p>}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {getProductText(language, product.id, 'title') || product.title}
        </h1>
        <div className="mb-6">
          <div className="flex flex-col gap-1">
            {/* Discounted price with discount percentage */}
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-gray-900">{formatPrice(price, currency)}</p>
              {discountPercent && discountPercent > 0 && (
                <span className="text-lg font-semibold text-blue-600">
                  -{discountPercent}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-gray-600 mb-8 prose prose-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(getProductText(language, product.id, 'longDescription') || product.description || '') }} />
      </div>
    </div>
  );
}



