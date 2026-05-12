/**
 * Mobile bottom nav vertical rhythm: Figma 183:1956 stack ×0.9, then ×0.95 (extra 5% tighter).
 * Tailwind needs full literal class strings for JIT.
 */
export const MOBILE_BOTTOM_NAV_INNER_PT_CLASS = 'pt-[20.52px]' as const;

export const MOBILE_BOTTOM_NAV_INNER_PB_CLASS =
  'pb-[calc(20.52px+env(safe-area-inset-bottom,0px))]' as const;

/** Nav item row height (40px × 0.9 × 0.95). */
export const MOBILE_BOTTOM_NAV_LINK_HEIGHT_CLASS = 'h-[34.2px]' as const;

/** Thin outline stroke for bottom-tab Lucide icons, bag, and CartIcon (h-6 w-6 tiles). */
export const MOBILE_BOTTOM_NAV_TAB_STROKE_WIDTH = 1.5;

/**
 * Main column bottom padding so content clears fixed `MobileBottomNav`
 * (20.52 + 34.2 + 20.52 px content stack) including iOS safe area.
 */
export const MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS =
  'max-lg:pb-[calc(75.24px+env(safe-area-inset-bottom,0px))]' as const;

/**
 * Wishlist / cart count on icons — cyan pill, high z-index so slots don’t clip it.
 */
export const MOBILE_BOTTOM_NAV_BADGE_CLASS =
  'pointer-events-none absolute -right-2 -top-1.5 z-20 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2db2ff] px-[2px] text-[8px] font-semibold leading-none text-white shadow-sm';
