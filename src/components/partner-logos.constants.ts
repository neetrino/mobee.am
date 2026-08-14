/** Գլխավոր էջի partner/brands շերտի միասնական քարտի չափերը։ */

export const PARTNER_LOGO_IMAGE_WIDTH_PX = 160;
export const PARTNER_LOGO_IMAGE_HEIGHT_PX = 123;

/** Apple-ի slug-ը admin-ում, որ սիլուետը մի քիչ փոքր երևա։ */
export const PARTNER_LOGO_APPLE_SLUG = 'apple';

export const PARTNER_LOGOS_SCROLL_EDGE_TOLERANCE_PX = 2;

export const PARTNER_LOGO_IMAGE_CLASS =
  'h-auto max-h-[80%] w-auto max-w-[80%] object-contain object-center';

export const PARTNER_LOGO_APPLE_IMAGE_CLASS =
  'h-auto max-h-[58%] w-auto max-w-[58%] object-contain object-center';

/** Desktop-ում միանգամից երևում է 6 քարտ (5 բացատ `gap-5`)։ */
export const PARTNER_LOGOS_TRACK_CLASS =
  'flex w-full gap-5 overflow-x-auto overscroll-x-contain [touch-action:pan-x] [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory';

/**
 * Մոբայլ՝ 140px։ Desktop՝ վեց հավասար սլայդ visible container-ի լայնքով։
 */
export const PARTNER_LOGO_CARD_CLASS =
  'relative flex aspect-[1.3] w-[140px] shrink-0 snap-start items-center justify-center overflow-hidden rounded-3xl border border-black/10 bg-white transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 lg:w-[calc((100%-5*1.25rem)/6)]';

/** Shop URL — այս բրենդը արդեն ընտրված է ֆիլտրում։ */
export function partnerLogoShopHref(slug: string): string {
  return `/shop?brand=${encodeURIComponent(slug)}`;
}

export const PARTNER_LOGOS_NAV_BUTTON_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-default disabled:opacity-40';
