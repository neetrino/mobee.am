'use client';

import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { HomeMoreCtaPillLink } from './HomeMoreCtaPillLink';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

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

/** Benefit column horizontal nudge; bottom row uses this at all widths. */
const WHY_CHOOSE_US_BENEFIT_SHIFT_X_CLASS = 'translate-x-[20%]';
/** Top row (warranty, delivery) — align with bottom row on lg–xl two-column grid (e.g. iPad Pro). Full string for Tailwind JIT. */
const WHY_CHOOSE_US_TOP_ROW_TABLET_SHIFT_X_CLASS = 'lg:max-xl:translate-x-[20%]';

const BENEFIT_ITEM_LAYOUT_CLASS: Record<BenefitId, string> = {
  warranty: WHY_CHOOSE_US_TOP_ROW_TABLET_SHIFT_X_CLASS,
  delivery: WHY_CHOOSE_US_TOP_ROW_TABLET_SHIFT_X_CLASS,
  installment: WHY_CHOOSE_US_BENEFIT_SHIFT_X_CLASS,
  original: WHY_CHOOSE_US_BENEFIT_SHIFT_X_CLASS,
};

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

function DeliveryIcon() {
  return (
    <svg
      width="52"
      height="43"
      viewBox="0 0 52.2503 42.5002"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-auto max-h-[48px]"
      aria-hidden
    >
      <path
        d="M38.3125 40.7502C41.0049 40.7502 43.1875 38.5675 43.1875 35.8752C43.1875 33.1828 41.0049 31.0002 38.3125 31.0002C35.6201 31.0002 33.4375 33.1828 33.4375 35.8752C33.4375 38.5675 35.6201 40.7502 38.3125 40.7502Z"
        stroke="#1A1C1D"
        strokeWidth="3.5"
      />
      <path
        d="M13.938 40.7502C16.6303 40.7502 18.8129 38.5675 18.8129 35.8752C18.8129 33.1828 16.6303 31.0002 13.938 31.0002C11.2456 31.0002 9.06295 33.1828 9.06295 35.8752C9.06295 38.5675 11.2456 40.7502 13.938 40.7502Z"
        stroke="#1A1C1D"
        strokeWidth="3.5"
      />
      <path
        d="M9.0625 35.8069C6.38856 35.6753 4.72375 35.2779 3.53425 34.0909C2.34475 32.9038 1.94988 31.2366 1.81825 28.5626M18.8125 35.8751H33.4375M43.1875 35.8069C45.8614 35.6753 47.5262 35.2779 48.7157 34.0909C50.5 32.3042 50.5 29.4328 50.5 23.6876V18.8126H39.0437C37.2278 18.8126 36.321 18.8126 35.5874 18.5738C34.8557 18.336 34.1908 17.9285 33.6468 17.3846C33.1029 16.8406 32.6953 16.1756 32.4576 15.444C32.2187 14.7103 32.2187 13.8036 32.2187 11.9876C32.2187 9.26496 32.2187 7.90484 31.8604 6.80309C31.5038 5.70567 30.8925 4.70822 30.0766 3.89228C29.2607 3.07634 28.2632 2.46508 27.1658 2.10847C26.064 1.75016 24.7039 1.75016 21.9812 1.75016H1.75M1.75 11.5002H16.375M1.75 18.8126H11.5"
        stroke="#1A1C1D"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.2188 6.62516H36.6574C40.2064 6.62516 41.9785 6.62516 43.4215 7.48803C44.8669 8.34847 45.7079 9.9109 47.3897 13.0358L50.5 18.8126"
        stroke="#1A1C1D"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstallmentIcon() {
  return (
    <svg
      width="57"
      height="42"
      viewBox="0 0 57 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-auto max-h-[48px]"
      aria-hidden
    >
      <path
        d="M24.225 8.4C23.1022 8.4 21.9904 8.61727 20.9531 9.03941C19.9157 9.46155 18.9732 10.0803 18.1792 10.8603C17.3853 11.6403 16.7555 12.5663 16.3258 13.5855C15.8962 14.6046 15.675 15.6969 15.675 16.8C15.675 17.9031 15.8962 18.9954 16.3258 20.0145C16.7555 21.0337 17.3853 21.9597 18.1792 22.7397C18.9732 23.5197 19.9157 24.1384 20.9531 24.5606C21.9904 24.9827 23.1022 25.2 24.225 25.2C26.4926 25.2 28.6673 24.315 30.2708 22.7397C31.8742 21.1644 32.775 19.0278 32.775 16.8C32.775 14.5722 31.8742 12.4356 30.2708 10.8603C28.6673 9.285 26.4926 8.4 24.225 8.4ZM19.95 16.8C19.95 15.6861 20.4004 14.6178 21.2021 13.8302C22.0038 13.0425 23.0912 12.6 24.225 12.6C25.3588 12.6 26.4462 13.0425 27.2479 13.8302C28.0496 14.6178 28.5 15.6861 28.5 16.8C28.5 17.9139 28.0496 18.9822 27.2479 19.7698C26.4462 20.5575 25.3588 21 24.225 21C23.0912 21 22.0038 20.5575 21.2021 19.7698C20.4004 18.9822 19.95 17.9139 19.95 16.8ZM0 6.3C0 4.62914 0.675601 3.02671 1.87818 1.84523C3.08075 0.663749 4.7118 0 6.4125 0H42.0375C42.8796 0 43.7135 0.162954 44.4915 0.479558C45.2695 0.796163 45.9764 1.26022 46.5718 1.84523C47.1673 2.43024 47.6396 3.12474 47.9619 3.88909C48.2841 4.65345 48.45 5.47267 48.45 6.3V27.3C48.45 28.1273 48.2841 28.9466 47.9619 29.7109C47.6396 30.4753 47.1673 31.1698 46.5718 31.7548C45.9764 32.3398 45.2695 32.8038 44.4915 33.1204C43.7135 33.437 42.8796 33.6 42.0375 33.6H6.4125C4.7118 33.6 3.08075 32.9363 1.87818 31.7548C0.675601 30.5733 0 28.9709 0 27.3V6.3ZM6.4125 4.2C5.8456 4.2 5.30192 4.42125 4.90106 4.81508C4.5002 5.2089 4.275 5.74305 4.275 6.3V8.4H6.4125C6.9794 8.4 7.52308 8.17875 7.92394 7.78492C8.3248 7.3911 8.55 6.85695 8.55 6.3V4.2H6.4125ZM4.275 21H6.4125C8.1132 21 9.74424 21.6637 10.9468 22.8452C12.1494 24.0267 12.825 25.6291 12.825 27.3V29.4H35.625V27.3C35.625 25.6291 36.3006 24.0267 37.5032 22.8452C38.7058 21.6637 40.3368 21 42.0375 21H44.175V12.6H42.0375C40.3368 12.6 38.7058 11.9363 37.5032 10.7548C36.3006 9.57329 35.625 7.97086 35.625 6.3V4.2H12.825V6.3C12.825 7.12733 12.6591 7.94655 12.3369 8.7109C12.0146 9.47526 11.5423 10.1698 10.9468 10.7548C10.3514 11.3398 9.64446 11.8038 8.86646 12.1204C8.08846 12.437 7.2546 12.6 6.4125 12.6H4.275V21ZM44.175 8.4V6.3C44.175 5.74305 43.9498 5.2089 43.5489 4.81508C43.1481 4.42125 42.6044 4.2 42.0375 4.2H39.9V6.3C39.9 7.4592 40.8576 8.4 42.0375 8.4H44.175ZM44.175 25.2H42.0375C41.4706 25.2 40.9269 25.4212 40.5261 25.8151C40.1252 26.2089 39.9 26.743 39.9 27.3V29.4H42.0375C42.6044 29.4 43.1481 29.1787 43.5489 28.7849C43.9498 28.3911 44.175 27.857 44.175 27.3V25.2ZM4.275 27.3C4.275 28.4592 5.2326 29.4 6.4125 29.4H8.55V27.3C8.55 26.743 8.3248 26.2089 7.92394 25.8151C7.52308 25.4212 6.9794 25.2 6.4125 25.2H4.275V27.3ZM6.84285 37.8C7.59349 39.0773 8.67324 40.138 9.97351 40.8753C11.2738 41.6125 12.7487 42.0005 14.25 42H43.4625C45.2403 42 47.0006 41.656 48.6431 40.9876C50.2855 40.3192 51.7779 39.3395 53.035 38.1045C54.292 36.8695 55.2892 35.4033 55.9695 33.7897C56.6498 32.1761 57 30.4466 57 28.7V14C57.0005 12.5251 56.6056 11.076 55.8552 9.79853C55.1047 8.52108 54.0251 7.46027 52.725 6.7228V28.7C52.725 31.1135 51.7491 33.4281 50.0121 35.1347C48.275 36.8413 45.9191 37.8 43.4625 37.8H6.84285Z"
        fill="#1A1C1D"
      />
    </svg>
  );
}

function OriginalIcon() {
  return (
    <svg
      width="37"
      height="48"
      viewBox="0 0 37 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-auto max-h-[48px]"
      aria-hidden
    >
      <path
        d="M13.0733 26.7322L15.1131 20.1263L9.74807 16.0468H16.4223L18.5 9.469L20.5777 16.0468H27.2519L21.849 20.1263L23.8887 26.7322L18.5 22.6246L13.0733 26.7322ZM4.93336 48V30.5872C3.37113 28.9778 2.15834 27.1174 1.29501 25.0059C0.431669 22.8944 0 20.6409 0 18.2456C0 13.1556 1.79308 8.8421 5.37923 5.30526C8.96538 1.76842 13.339 0 18.5 0C23.661 0 28.0346 1.76842 31.6208 5.30526C35.2069 8.8421 37 13.1556 37 18.2456C37 20.6409 36.5683 22.8944 35.705 25.0059C34.8417 27.1174 33.6289 28.9778 32.0666 30.5872V48L18.5 43.7427L4.93336 48ZM18.5 32.8422C22.6111 32.8422 26.1056 31.4231 28.9834 28.5848C31.8612 25.7466 33.3001 22.3002 33.3001 18.2456C33.3001 14.191 31.8612 10.7446 28.9834 7.90638C26.1056 5.06816 22.6111 3.64905 18.5 3.64905C14.3889 3.64905 10.8944 5.06816 8.01661 7.90638C5.13882 10.7446 3.69993 14.191 3.69993 18.2456C3.69993 22.3002 5.13882 25.7466 8.01661 28.5848C10.8944 31.4231 14.3889 32.8422 18.5 32.8422ZM8.63329 42.6574L18.5 40.0469L28.3667 42.6574V33.6187C26.9594 34.5232 25.4194 35.2281 23.7464 35.7333C22.0735 36.2386 20.3247 36.4912 18.5 36.4912C16.6753 36.4912 14.9265 36.2386 13.2536 35.7333C11.5806 35.2281 10.0406 34.5232 8.63329 33.6187V42.6574Z"
        fill="#1A1C1D"
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
        <li
          key={item.id}
          className={`flex max-w-[289px] flex-col items-start ${BENEFIT_ITEM_LAYOUT_CLASS[item.id]}`}
        >
          <div className="mb-6 shrink-0">
            {item.id === 'warranty' ? (
              <WarrantyIcon />
            ) : item.id === 'delivery' ? (
              <DeliveryIcon />
            ) : item.id === 'installment' ? (
              <InstallmentIcon />
            ) : item.id === 'original' ? (
              <OriginalIcon />
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
    <section className="mt-[7.5rem]" aria-labelledby="why-choose-us-heading">
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} flex flex-col gap-[103.68px] ${montserrat.className}`}>
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
          <HomeMoreCtaPillLink href="/about" variant="cyanPromo">
            {t('home.why_choose_us_heading.cta')}
          </HomeMoreCtaPillLink>
        </div>

        <WhyChooseUsBenefitsList t={t} />
      </div>
    </section>
  );
}
