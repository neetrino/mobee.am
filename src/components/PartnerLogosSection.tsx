'use client';

import Image from 'next/image';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

type PartnerLogoId = 'apple' | 'lg' | 'samsung' | 'xiaomi';

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
    id: 'samsung',
    src: '/images/home/partner-logos/samsung.svg',
    width: 211,
    height: 33,
    mobileWrapperClass: 'h-[22px] w-[108px] max-w-[85%]',
    desktopWrapperClass: 'h-[33px] w-[211px]',
  },
  {
    id: 'xiaomi',
    src: '/images/home/partner-logos/xiaomi.svg',
    width: 83,
    height: 53,
    mobileWrapperClass: 'h-[48px] w-[75px]',
    desktopWrapperClass: 'h-[53px] w-[83px]',
  },
  {
    id: 'lg',
    src: '/images/home/partner-logos/lg.svg',
    width: 121,
    height: 53,
    mobileWrapperClass: 'h-[45px] w-[103px] max-w-full',
    desktopWrapperClass: 'h-[53px] w-[121px]',
  },
];

/** Mobile: horizontal strip with 2.5 manufacturer cards visible. */
const PARTNER_MOBILE_TRACK_CLASS =
  'flex gap-3 overflow-x-auto overscroll-x-contain [touch-action:pan-x] [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-proximity lg:hidden';

/**
 * Partner brand strip — matches Figma “Partner Logos” (node 1:248).
 * Mobile: scroll snap by 2 logos; desktop: flat logo row.
 */
export function PartnerLogosSection() {
  const { t } = useTranslation();

  return (
    <section
      className="bg-white"
      aria-label={t('home.partner_logos.heading')}
    >
      <div className="pb-4 pt-8 lg:hidden">
        <div className={SITE_CONTENT_GUTTERS_CLASS}>
          <div
            className={PARTNER_MOBILE_TRACK_CLASS}
            aria-roledescription="carousel"
            aria-label={t('home.partner_logos.heading')}
          >
            {PARTNER_LOGOS.map((item) => (
              <div
                key={item.id}
                className="flex h-[100px] w-[calc((100%-1.5rem)/2.5)] shrink-0 snap-start items-center justify-center rounded-[20px] border border-[#e7e7e7] bg-white px-3 sm:w-[180px] md:w-[200px]"
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
