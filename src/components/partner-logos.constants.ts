/** Գլխավոր էջի partner/brands շերտ — Redstore-ի նման քարտեր + հորիզոնական slider։ */

export type PartnerLogoId =
  | 'apple'
  | 'bosch'
  | 'dyson'
  | 'hisense'
  | 'lg'
  | 'midea'
  | 'samsung'
  | 'sony';

export type PartnerLogoItem = {
  id: PartnerLogoId;
  src: string;
  width: number;
  height: number;
  imageClassName?: string;
};

export const PARTNER_LOGO_IMAGE_CLASS =
  'h-auto max-h-[80%] w-auto max-w-[80%] object-contain object-center';

/** Apple-ի սիլուետը քարտում մի քիչ մեծ էր wordmark-ներից։ */
export const PARTNER_LOGO_APPLE_IMAGE_CLASS =
  'h-auto max-h-[58%] w-auto max-w-[58%] object-contain object-center';

export const PARTNER_LOGOS: readonly PartnerLogoItem[] = [
  {
    id: 'apple',
    src: '/images/home/partner-logos/apple.svg',
    width: 58,
    height: 69,
    imageClassName: PARTNER_LOGO_APPLE_IMAGE_CLASS,
  },
  {
    id: 'samsung',
    src: '/images/home/partner-logos/samsung.svg',
    width: 211,
    height: 33,
  },
  {
    id: 'lg',
    src: '/images/home/partner-logos/lg.svg',
    width: 121,
    height: 53,
  },
  {
    id: 'bosch',
    src: '/images/home/partner-logos/bosch.webp',
    width: 465,
    height: 116,
  },
  {
    id: 'midea',
    src: '/images/home/partner-logos/midea.webp',
    width: 480,
    height: 185,
  },
  {
    id: 'sony',
    src: '/images/home/partner-logos/sony.webp',
    width: 454,
    height: 88,
  },
  {
    id: 'dyson',
    src: '/images/home/partner-logos/dyson.webp',
    width: 480,
    height: 183,
  },
  {
    id: 'hisense',
    src: '/images/home/partner-logos/hisense.webp',
    width: 480,
    height: 76,
  },
];

export const PARTNER_LOGOS_SCROLL_EDGE_TOLERANCE_PX = 2;

/** Desktop-ում միանգամից երևում է 6 քարտ (5 բացատ `gap-5`)։ */
export const PARTNER_LOGOS_TRACK_CLASS =
  'flex w-full gap-5 overflow-x-auto overscroll-x-contain [touch-action:pan-x] [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory';

/**
 * Մոբայլ՝ 140px։ Desktop՝ վեց հավասար սլայդ visible container-ի լայնքով։
 * aspect 1.3, rounded-3xl, բաց border — ինչպես redstore.am manufacturers շերտը։
 */
export const PARTNER_LOGO_CARD_CLASS =
  'relative flex aspect-[1.3] w-[140px] shrink-0 snap-start items-center justify-center overflow-hidden rounded-3xl border border-black/10 bg-white transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 lg:w-[calc((100%-5*1.25rem)/6)]';

/** Shop URL — այս բրենդը արդեն ընտրված է ֆիլտրում։ */
export function partnerLogoShopHref(id: PartnerLogoId): string {
  return `/shop?brand=${id}`;
}

export const PARTNER_LOGOS_NAV_BUTTON_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-default disabled:opacity-40';
