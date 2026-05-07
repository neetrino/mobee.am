/**
 * LocalStorage key for guest cart
 */
export const CART_KEY = 'shop_cart_guest';

/** Empty cart hero image (Figma: mobee-new empty state) */
export const EMPTY_CART_IMAGE_SRC = '/images/cart/empty-cart-basket.png';

export const EMPTY_CART_IMAGE_WIDTH = 285;

export const EMPTY_CART_IMAGE_HEIGHT = 256;

/**
 * Desktop cart line card: shorter than home ProductCard (583px) but same visual rhythm.
 */
export const CART_ITEM_ROW_DESKTOP_MIN_HEIGHT_CLASS = 'lg:min-h-[400px]';

export const CART_ITEM_ROW_DESKTOP_IMAGE_STACK_CLASS = 'lg:h-[240px]';

export const CART_ITEM_ROW_DESKTOP_IMAGE_FRAME_CLASS = 'lg:h-[200px]';

export const CART_ITEM_ROW_DESKTOP_IMAGE_MAT_CLASS = 'lg:py-4';

/**
 * Outer shell for cart / wishlist line cards (same visual rhythm as home rows).
 */
export const CART_LINE_ITEM_CARD_FRAME_CLASS =
  'relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-[#f6f6f6] transition-shadow hover:shadow-md max-lg:rounded-2xl max-lg:border-0 max-lg:bg-[#f2f2f7] max-lg:shadow-sm max-lg:hover:shadow-md';

/**
 * Bottom strip: price / actions (cart quantity or wishlist CTAs).
 */
export const CART_LINE_ITEM_CARD_FOOTER_CLASS =
  'mt-auto flex shrink-0 flex-col items-center gap-2 border-t border-[#e5e5e5] bg-[#f2f2f7] px-2 pb-3 pt-3 max-lg:border-0 lg:border-[#e5e5e5] lg:bg-transparent lg:px-5 lg:pb-4 lg:pt-3';

/** Order summary sidebar card — `border-radius` 15px. */
export const ORDER_SUMMARY_PANEL_RADIUS_CLASS = 'rounded-[15px]';

