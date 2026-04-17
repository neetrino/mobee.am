'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

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

/**
 * Heading row below special offers — matches {@link SpecialOffersSectionHeading} layout (Figma node 1:315).
 */
export function WhyChooseUsSection() {
  const { t } = useTranslation();

  return (
    <div
      className={`mt-[7.5rem] ${montserrat.className}`}
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
    </div>
  );
}
