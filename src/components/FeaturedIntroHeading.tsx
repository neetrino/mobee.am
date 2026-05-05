'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

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

export function FeaturedIntroHeading() {
  const { t } = useTranslation();

  return (
    <section
      className={`hidden bg-white lg:block ${montserrat.className}`}
      aria-labelledby="featured-intro-heading"
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-10 pt-6`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            <h2
              id="featured-intro-heading"
              className="text-[30px] font-bold leading-9 text-[#111827]"
            >
              {t('home.featured_intro.title')}
            </h2>
            <p className="max-w-[486px] text-base font-normal leading-6 text-[#6b7280]">
              {t('home.featured_intro.subtitle')}
            </p>
          </div>
          <Link
            href="/products"
            className="group flex h-12 w-[min(100%,159px)] shrink-0 items-center justify-between rounded-full border-2 border-[#2db2ff] bg-[#2db2ff] pl-5 pr-0.5 transition-colors duration-200 hover:bg-[#1e1e1e] active:scale-[0.99] sm:w-[159px]"
          >
            <span className="text-right text-[12px] font-medium leading-none text-[#1e1e1e] transition-colors duration-200 group-hover:text-white">
              {t('home.featured_intro.cta')}
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
    </section>
  );
}
