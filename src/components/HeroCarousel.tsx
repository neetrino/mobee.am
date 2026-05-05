'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Montserrat, Noto_Sans_Armenian } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { HERO_MOBILE_CONTENT_GUTTERS_CLASS, SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const notoArmenian = Noto_Sans_Armenian({
  subsets: ['armenian'],
  weight: ['400', '700', '900'],
  display: 'swap',
});

const IMG_AIRPODS = '/images/hero/airpods-max.png';
const IMG_IPHONE = '/images/hero/iphone.png';

function CtaArrowIcon() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#1e1e1e]"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobileHeroIphoneBanner() {
  const { t, lang } = useTranslation();
  const titleClass = lang === 'hy' ? notoArmenian.className : montserrat.className;

  return (
    <div
      className={`pb-2 pt-[calc(theme(spacing.4)*1.05+4px)] lg:hidden ${montserrat.className}`}
    >
      <div className={HERO_MOBILE_CONTENT_GUTTERS_CLASS}>
        <div className="relative isolate min-h-[208px] overflow-hidden rounded-[30px] bg-[#e3ebf7] px-4 pb-3 pt-5 sm:min-h-[220px]">
          <div className="relative z-10 flex max-w-[55%] flex-col items-start gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-xs font-normal leading-normal text-[#14ae5c]">
              {t('home.hero_free_shipping')}
            </span>
            <p
              className={`${titleClass} text-[clamp(1.5rem,7vw,2rem)] font-bold leading-tight tracking-tight text-black`}
            >
              {lang === 'hy' ? (
                <>
                  <span className="block">{t('home.hero_iphone_title_mobile_line1')}</span>
                  <span className="block">{t('home.hero_iphone_title_mobile_line2')}</span>
                </>
              ) : (
                t('home.hero_iphone_title')
              )}
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 z-[1] h-[min(56%,168px)] w-[min(58%,220px)] min-h-[140px] min-w-[160px] max-w-[220px]">
            <Image
              src={IMG_IPHONE}
              alt=""
              fill
              className="object-contain object-right-bottom"
              sizes="220px"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroCarousel() {
  const { t, lang } = useTranslation();
  const headlineClass = lang === 'hy' ? notoArmenian.className : montserrat.className;

  return (
    <section className={`bg-white ${montserrat.className}`}>
      <MobileHeroIphoneBanner />

      <div className={`hidden lg:block ${SITE_CONTENT_GUTTERS_CLASS} pb-20 pt-[calc(theme(spacing.8)*4)]`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-5">
          <div className="relative min-h-[320px] flex-1 overflow-visible sm:min-h-[346px]">
            <div className="absolute inset-0 z-0 rounded-[40px] bg-[#e9ecf0]" aria-hidden />
            <div className="absolute right-4 top-4 z-30 sm:right-8 sm:top-8 md:right-10 md:top-10">
              <span className="inline-flex items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[12px] font-normal leading-normal text-[#14ae5c]">
                {t('home.hero_free_shipping')}
              </span>
            </div>

            <div className="relative z-20 flex h-full min-h-[inherit] flex-col px-6 pb-4 pt-12 sm:max-w-[min(52%,20rem)] sm:px-10 sm:pb-10 sm:pt-14 md:max-w-[55%] md:px-[54px] md:pb-8">
              <h2
                id="hero-promo-heading"
                className={`${headlineClass} text-[clamp(2.75rem,8vw,5.125rem)] font-black leading-none tracking-tight text-black`}
              >
                {t('home.hero_promo_headline')}
              </h2>
              <p className="mt-6 max-w-[207px] text-[14px] font-normal leading-5 text-black sm:max-w-none">
                <span className="block">{t('home.hero_promo_body_line1')}</span>
                <span className="block">{t('home.hero_promo_body_line2')}</span>
              </p>
              <div className="mt-8 md:mt-10">
                <Link
                  href="/products"
                  className="group inline-flex h-12 min-w-[159px] items-center justify-between gap-2 rounded-full border-2 border-[#1e1e1e] bg-[#1e1e1e] pl-5 pr-1.5 transition-colors duration-200 hover:bg-[#2db2ff]"
                >
                  <span className="flex-1 text-right text-[12px] font-medium leading-none text-[#2db2ff] transition-colors duration-200 group-hover:text-[#1e1e1e]">
                    {t('home.hero_cta_more')}
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2db2ff]">
                    <CtaArrowIcon />
                  </span>
                </Link>
              </div>
            </div>

            <div className="pointer-events-none relative z-10 mx-auto mt-2 h-[214px] w-full max-w-[287px] -translate-x-1/2 -translate-y-[40%] sm:absolute sm:bottom-0 sm:right-0 sm:mx-0 sm:mt-0 sm:h-[369px] sm:w-[280px] sm:max-w-none sm:-translate-x-[47%] sm:-translate-y-[20.5px]">
              <Image
                src={IMG_AIRPODS}
                alt=""
                fill
                className="object-contain object-center sm:object-right-bottom"
                sizes="(max-width: 640px) 287px, 280px"
                priority
              />
            </div>
          </div>

          <div className="flex w-full min-w-0 shrink-0 flex-col gap-5 lg:w-[min(100%,413px)] lg:justify-between lg:gap-0">
            <div className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-[40px] bg-[#cde6ff] px-8 pb-7 pt-7 sm:gap-5 sm:px-12 sm:pb-8 sm:pt-8 lg:h-[178px] lg:w-full lg:shrink-0 lg:gap-2 lg:px-12 lg:py-6">
              <p className="w-full min-w-0 max-w-full break-words text-[12px] font-normal leading-4 text-[#111]">
                <span className="block">{t('home.hero_chat_line1')}</span>
                <span>
                  <span className="font-extrabold">{t('home.hero_chat_bold')}</span>
                  {t('home.hero_chat_line2')}
                </span>
              </p>
              <div
                className={
                  lang === 'ru'
                    ? `${headlineClass} flex w-full min-w-0 flex-nowrap items-baseline gap-x-1.5 whitespace-nowrap text-[clamp(1.875rem,6.25vw,3rem)] font-black leading-none lg:text-[clamp(1.75rem,4vw,2.75rem)]`
                    : `${headlineClass} flex w-full min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[clamp(2.5rem,10vw,3.875rem)] font-black leading-none [overflow-wrap:anywhere] lg:flex-nowrap lg:text-[clamp(2rem,4vw,3rem)]`
                }
              >
                <span className={lang === 'ru' ? 'shrink-0 text-black' : 'min-w-0 break-words text-black'}>
                  {t('home.hero_promo_headline')}
                </span>
                <span
                  className={`min-w-0 shrink-0 text-[#ff490d] ${lang === 'ru' ? '-translate-y-[0.14em]' : ''}`}
                >
                  {t('home.hero_discount_percent')}
                </span>
              </div>
            </div>

            <div className="relative min-h-[160px] overflow-hidden rounded-[40px] bg-[#e9ecf0]">
              <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
                <span className="inline-flex w-fit items-center rounded-full bg-white px-1.5 py-0.5 text-[12px] font-normal leading-normal text-[#14ae5c]">
                  {t('home.hero_free_shipping')}
                </span>
                <p className="mt-3 max-w-[137px] text-[22px] font-bold leading-none text-black">
                  {t('home.hero_iphone_title')}
                </p>
              </div>
              <div className="absolute bottom-0 right-0 h-[132px] w-[215px] overflow-hidden rounded-bl-[14px] rounded-br-[38px] rounded-tl-[14px] rounded-tr-[14px] sm:h-[131px]">
                <Image
                  src={IMG_IPHONE}
                  alt=""
                  fill
                  className="object-cover object-right-bottom"
                  sizes="215px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
