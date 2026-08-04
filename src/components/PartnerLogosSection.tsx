'use client';

import Image from 'next/image';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

type PartnerLogoId = 'apple' | 'lg' | 'samsung' | 'xiaomi';

const PARTNER_LOGOS_PER_MOBILE_PAGE = 2;

const PARTNER_LOGOS: readonly {
  id: PartnerLogoId;
  src: string;
  width: number;
  height: number;
  /** Mobile sizes — larger in the snap card. */
  mobileWrapperClass: string;
  desktopWrapperClass: string;
}[] = [
  {
    id: 'apple',
    src: '/images/home/partner-logos/apple.svg',
    width: 58,
    height: 69,
    mobileWrapperClass: 'h-[68px] w-[57px]',
    desktopWrapperClass: 'h-[69px] w-[58px]',
  },
  {
    id: 'lg',
    src: '/images/home/partner-logos/lg.svg',
    width: 121,
    height: 53,
    mobileWrapperClass: 'h-[54px] w-[123px] max-w-full',
    desktopWrapperClass: 'h-[53px] w-[121px]',
  },
  {
    id: 'samsung',
    src: '/images/home/partner-logos/samsung.svg',
    width: 211,
    height: 33,
    mobileWrapperClass: 'h-[24px] w-[150px] max-w-[85%]',
    desktopWrapperClass: 'h-[33px] w-[211px]',
  },
  {
    id: 'xiaomi',
    src: '/images/home/partner-logos/xiaomi.svg',
    width: 83,
    height: 53,
    mobileWrapperClass: 'h-[38px] w-[60px]',
    desktopWrapperClass: 'h-[53px] w-[83px]',
  },
];

/** Mobile: horizontal snap — 2 brand cards per page. */
const PARTNER_MOBILE_TRACK_CLASS =
  'flex [touch-action:pan-x] overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory lg:hidden';

function chunkPartnerLogosForMobilePages<T>(items: readonly T[], pageSize: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push([...items.slice(index, index + pageSize)]);
  }
  return pages;
}

/**
 * Partner brand strip — matches Figma “Partner Logos” (node 1:248).
 * Mobile: scroll snap by 2 logos; desktop: flat logo row.
 */
export function PartnerLogosSection() {
  const { t } = useTranslation();
  const mobilePages = chunkPartnerLogosForMobilePages(PARTNER_LOGOS, PARTNER_LOGOS_PER_MOBILE_PAGE);

  return (
    <section className="bg-white" aria-labelledby="partner-logos-heading">
      <h2 id="partner-logos-heading" className="sr-only">
        {t('home.partner_logos.heading')}
      </h2>

      <div className="pb-4 pt-8 lg:hidden">
        <div
          className={PARTNER_MOBILE_TRACK_CLASS}
          aria-roledescription="carousel"
          aria-label={t('home.partner_logos.heading')}
        >
          {mobilePages.map((pageItems) => (
            <div
              key={pageItems.map((item) => item.id).join('-')}
              className="grid w-full shrink-0 snap-center grid-cols-2 gap-3 px-3"
            >
              {pageItems.map((item) => (
                <div
                  key={item.id}
                  className="flex h-[120px] w-full items-center justify-center rounded-2xl border border-[#eeeef0] bg-[#f7f8fa] px-4"
                >
                  <div
                    className={`relative flex max-w-full shrink-0 items-center justify-center ${item.mobileWrapperClass}`}
                  >
                    <Image
                      src={item.src}
                      alt={t(`home.partner_logos.${item.id}`)}
                      width={item.width}
                      height={item.height}
                      className="h-full w-full object-contain object-center"
                      unoptimized
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={`${SITE_CONTENT_GUTTERS_CLASS} hidden pb-[49px] pt-12 lg:block`}>
        <div className="flex min-h-[105px] flex-wrap items-center justify-center gap-x-[113px] gap-y-[143px]">
          {PARTNER_LOGOS.map((item) => (
            <div
              key={item.id}
              className={`relative flex shrink-0 items-center justify-center ${item.desktopWrapperClass}`}
            >
              <Image
                src={item.src}
                alt={t(`home.partner_logos.${item.id}`)}
                width={item.width}
                height={item.height}
                className="h-full w-full object-contain object-center"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
