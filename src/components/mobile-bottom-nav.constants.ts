/**
 * Main column bottom padding so content clears fixed `MobileBottomNav`
 * (Figma 183:1956: 24 + 40 + 24 px) including iOS safe area.
 */
export const MOBILE_BOTTOM_NAV_BODY_PADDING_BOTTOM_CLASS =
  'max-lg:pb-[calc(88px+env(safe-area-inset-bottom,0px))]' as const;
