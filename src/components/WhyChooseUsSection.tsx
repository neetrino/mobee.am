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
  { id: 'warranty', src: '/images/home/why-choose-us/warranty.png', width: 44, height: 42 },
  { id: 'delivery', src: '/images/home/why-choose-us/delivery.png', width: 49, height: 39 },
  { id: 'installment', src: '/images/home/why-choose-us/installment.png', width: 57, height: 42 },
  { id: 'original', src: '/images/home/why-choose-us/original.png', width: 37, height: 48 },
];

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
            <Image
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              className="h-auto max-h-[48px] w-auto object-contain object-left"
            />
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
