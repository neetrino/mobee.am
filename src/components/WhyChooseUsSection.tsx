'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

type BenefitId = 'warranty' | 'delivery' | 'installment' | 'original';

const BENEFITS: readonly {
  id: BenefitId;
  src: string;
  width: number;
  height: number;
}[] = [
  { id: 'warranty', src: '/images/home/why-choose-us/warranty.svg', width: 44, height: 42 },
  { id: 'delivery', src: '/images/home/why-choose-us/delivery.png', width: 49, height: 39 },
  { id: 'installment', src: '/images/home/why-choose-us/installment.png', width: 57, height: 42 },
  { id: 'original', src: '/images/home/why-choose-us/original.png', width: 37, height: 48 },
];

function WarrantyIcon() {
  return (
    <svg
      width="44"
      height="42"
      viewBox="0 0 44 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-auto max-h-[48px]"
      aria-hidden
    >
      <path
        d="M15.2074 42L11.4056 35.5977L4.18696 34.0175L4.89162 26.5918L0 21L4.89162 15.4082L4.18696 7.98245L11.4056 6.40234L15.2074 0L22 2.88187L28.7926 0L32.5944 6.40234L39.813 7.98245L39.1084 15.4082L44 21L39.1084 26.5918L39.813 34.0175L32.5944 35.5977L28.7926 42L22 39.1181L15.2074 42ZM16.5676 37.9229L22 35.6223L27.498 37.9229L30.5215 32.8141L36.38 31.4714L35.8474 25.4702L39.7885 21L35.8474 16.4643L36.38 10.4631L30.5215 9.18591L27.4324 4.07711L22 6.37771L16.502 4.07711L13.4785 9.18591L7.62004 10.4631L8.15263 16.4643L4.21146 21L8.15263 25.4702L7.62004 31.5369L13.4785 32.8141L16.5676 37.9229ZM19.7631 27.8199L31.0622 16.5298L28.8172 14.2211L19.7631 23.2679L15.1828 18.7568L12.9378 21L19.7631 27.8199Z"
        fill="#1A1C1D"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M1 4h6M4.5 1.5L7 4l-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhyChooseUsBenefitsList({ t }: { t: (path: string) => string }) {
  return (
    <ul
      className="grid grid-cols-1 gap-x-[50px] gap-y-10 sm:grid-cols-2 xl:grid-cols-4"
      aria-labelledby="why-choose-us-heading"
    >
      {BENEFITS.map((item) => (
        <li key={item.id} className="flex max-w-[289px] flex-col items-start">
          <div className="mb-6 shrink-0">
            {item.id === 'warranty' ? (
              <WarrantyIcon />
            ) : (
              <Image
                src={item.src}
                alt=""
                width={item.width}
                height={item.height}
                className="h-auto max-h-[48px] w-auto object-contain object-left"
              />
            )}
          </div>
          <h3 className="mb-3 text-[14px] font-bold uppercase leading-[21px] tracking-[0.7px] text-[#1a1c1d]">
            {t(`home.why_choose_us_benefits.${item.id}_title`)}
          </h3>
          <p className="text-[14px] font-normal leading-[22.75px] text-[#52525b]">
            {t(`home.why_choose_us_benefits.${item.id}_description`)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Heading + benefit columns — heading row matches {@link SpecialOffersSectionHeading} (Figma ~1:315);
 * benefit row matches Figma node 1:322.
 */
export function WhyChooseUsSection() {
  const { t } = useTranslation();

  return (
    <div
      className={`mt-[7.5rem] flex flex-col gap-[50px] ${montserrat.className}`}
      aria-labelledby="why-choose-us-heading"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <h2
            id="why-choose-us-heading"
            className="text-[30px] font-bold leading-[60px] text-[#1a1c1d]"
          >
            {t('home.why_choose_us_heading.title')}
          </h2>
          <p className="max-w-[416px] text-base font-normal leading-6 text-[#6b7280]">
            {t('home.why_choose_us_heading.subtitle')}
          </p>
        </div>
        <Link
          href="/about"
          className="flex h-12 w-[min(100%,159px)] shrink-0 items-center justify-between rounded-full bg-[#2db2ff] pl-5 pr-0.5 transition-opacity hover:opacity-95 active:scale-[0.99] sm:w-[159px]"
        >
          <span className="text-right text-[12px] font-medium leading-none text-[#1e1e1e]">
            {t('home.why_choose_us_heading.cta')}
          </span>
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1e1e1e] text-white"
            aria-hidden
          >
            <ArrowRightIcon className="size-2" />
          </span>
        </Link>
      </div>

      <WhyChooseUsBenefitsList t={t} />
    </div>
  );
}
