'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Card } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';
import { resolveProductCardImageSrc } from '../../../lib/productCardDisplayImage';
import { ProductImagePlaceholder } from '../../../components/ProductImagePlaceholder';
import { DISMISS_ROUND_BUTTON_HOVER_CLASS } from '../../../lib/dismiss-icon-button.constants';
import type { Cart, CartItem } from '../types';
import {
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
} from '../constants';

const CHECKOUT_ORDER_ITEMS_CARD_CLASS = `p-6 ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS}`;

interface CheckoutOrderItemsProps {
  cart: Cart;
  onRemove: (itemId: string) => void;
  removingItemId?: string | null;
}

interface CheckoutOrderItemTileProps {
  item: CartItem;
  onRemove: (itemId: string) => void;
  isRemoving: boolean;
}

function CheckoutOrderItemTile({ item, onRemove, isRemoving }: CheckoutOrderItemTileProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const imageSrc = resolveProductCardImageSrc(item.variant.product.image);
  const productTitle = item.variant.product.title;

  useEffect(() => {
    setImageError(false);
  }, [item.id, imageSrc]);

  return (
    <li className="w-[88px] shrink-0">
      <div className="relative">
        <div className="relative flex h-[104px] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
          {imageError ? (
            <ProductImagePlaceholder
              className="absolute inset-0"
              aria-label={productTitle ? `No image for ${productTitle}` : 'No image'}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={productTitle}
              fill
              sizes="88px"
              className="object-contain p-2"
              onError={() => setImageError(true)}
            />
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            className={`absolute right-1 top-1 z-10 flex size-6 -translate-y-[3px] translate-x-[3px] items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-500 shadow-md backdrop-blur-sm transition-colors disabled:cursor-default disabled:opacity-50 ${DISMISS_ROUND_BUTTON_HOVER_CLASS}`}
            aria-label={t('common.buttons.remove')}
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {item.quantity > 1 ? (
            <span className="absolute bottom-1.5 right-1.5 z-10 rounded-full bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
              ×{item.quantity}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-center text-xs font-bold uppercase leading-snug text-gray-900">
        {productTitle}
      </p>
    </li>
  );
}

function formatItemCountLabel(count: number, t: (key: string) => string): string {
  if (count === 1) {
    return `1 ${t('common.cart.item')}`;
  }
  return `${count} ${t('common.cart.items')}`;
}

export function CheckoutOrderItems({ cart, onRemove, removingItemId = null }: CheckoutOrderItemsProps) {
  const { t } = useTranslation();

  return (
    <Card className={CHECKOUT_ORDER_ITEMS_CARD_CLASS}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
          {t('checkout.orderItems.title')}
        </h2>
        <span className="shrink-0 text-sm text-gray-500">{formatItemCountLabel(cart.itemsCount, t)}</span>
      </div>
      <ul className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cart.items.map((item) => (
          <CheckoutOrderItemTile
            key={item.id}
            item={item}
            onRemove={onRemove}
            isRemoving={removingItemId === item.id}
          />
        ))}
      </ul>
    </Card>
  );
}
