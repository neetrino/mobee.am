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
  wrapperClass: string;
}[] = [
  {
    id: 'apple',
    src: '/images/home/partner-logos/apple.svg',
    width: 58,
    height: 69,
    wrapperClass: 'h-[41px] w-[35px] lg:h-[69px] lg:w-[58px]',
  },
  {
    id: 'lg',
    src: '/images/home/partner-logos/lg.svg',
    width: 121,
    height: 53,
    wrapperClass: 'h-[32px] w-[73px] lg:h-[53px] lg:w-[121px]',
  },
  {
    id: 'samsung',
    src: '/images/home/partner-logos/samsung.svg',
    width: 211,
    height: 33,
    wrapperClass: 'h-[20px] w-[127px] max-w-full lg:h-[33px] lg:w-[211px]',
  },
  {
    id: 'xiaomi',
    src: '/images/home/partner-logos/xiaomi.svg',
    width: 83,
    height: 53,
    wrapperClass: 'h-[32px] w-[50px] lg:h-[53px] lg:w-[83px]',
  },
];

/**
 * Partner brand strip — matches Figma “Partner Logos” (node 1:248).
 * Mobile: 2-column cards; desktop: flat logo row.
 */
export function PartnerLogosSection() {
  const { t } = useTranslation();

  return (
    <section
      className="bg-white"
      aria-labelledby="partner-logos-heading"
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pt-8 pb-4 lg:pb-[49px] lg:pt-12`}>
        <h2 id="partner-logos-heading" className="sr-only">
          {t('home.partner_logos.heading')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:flex lg:min-h-[105px] lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-[113px] lg:gap-y-[143px]">
          {PARTNER_LOGOS.map((item) => (
            <div
              key={item.id}
              className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-[#eeeef0] bg-[#f7f8fa] px-4 py-5 lg:aspect-auto lg:w-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
            >
              <div
                className={`relative flex shrink-0 items-center justify-center ${item.wrapperClass}`}
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
    </section>
  );
}
