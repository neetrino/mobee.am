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
    wrapperClass: 'h-[69px] w-[58px]',
  },
  {
    id: 'lg',
    src: '/images/home/partner-logos/lg.svg',
    width: 121,
    height: 53,
    wrapperClass: 'h-[53px] w-[121px]',
  },
  {
    id: 'samsung',
    src: '/images/home/partner-logos/samsung.svg',
    width: 211,
    height: 33,
    wrapperClass: 'h-[33px] w-[211px]',
  },
  {
    id: 'xiaomi',
    src: '/images/home/partner-logos/xiaomi.svg',
    width: 83,
    height: 53,
    wrapperClass: 'h-[53px] w-[83px]',
  },
];

/**
 * Partner brand strip — matches Figma “Partner Logos” (node 1:248).
 */
export function PartnerLogosSection() {
  const { t } = useTranslation();

  return (
    <section
      className="border-b border-solid border-[#eeeef0] bg-white"
      aria-labelledby="partner-logos-heading"
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-[49px] pt-12`}>
        <h2 id="partner-logos-heading" className="sr-only">
          {t('home.partner_logos.heading')}
        </h2>
        <div className="flex min-h-[105px] flex-wrap items-center justify-center gap-x-12 gap-y-10 sm:gap-x-16 lg:gap-x-[113px] lg:gap-y-[143px]">
          {PARTNER_LOGOS.map((item) => (
            <div
              key={item.id}
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
          ))}
        </div>
      </div>
    </section>
  );
}
