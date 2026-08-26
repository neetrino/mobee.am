'use client';

import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { useTranslation } from '../lib/i18n-client';
import { WHY_CHOOSE_US_PHOTO_SRC } from '../lib/constants/ui-icons.constants';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { HomeCtaPillArrowIcon } from './HomeMoreCtaPillLink';

const montserrat = siteMontserrat;

/** Figma Mobee-Dev-Neew node 91:1286 — Why Choose Us collage card radius. */
const WHY_CHOOSE_US_CARD_RADIUS_CLASS = 'rounded-[26px]';

/** Figma glass CTA pill — grows with label so text stays fully visible. */
const WHY_CHOOSE_US_GLASS_PILL_WIDTH_CLASS = 'w-auto max-w-[calc(100%-36px)]';

type BenefitId = 'delivery' | 'installment' | 'warranty' | 'original';

type BenefitCardConfig = {
  readonly href: string;
  readonly imageSrc: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly heightClass: string;
  readonly objectPositionClass: string;
};

const BENEFIT_CARDS: Record<BenefitId, BenefitCardConfig> = {
  delivery: {
    href: '/delivery',
    imageSrc: WHY_CHOOSE_US_PHOTO_SRC.delivery,
    imageWidth: 375,
    imageHeight: 559,
    heightClass: 'h-[559px]',
    objectPositionClass: 'object-bottom',
  },
  installment: {
    href: '/credit',
    imageSrc: WHY_CHOOSE_US_PHOTO_SRC.installment,
    imageWidth: 392,
    imageHeight: 284,
    heightClass: 'h-[284px]',
    objectPositionClass: 'object-center',
  },
  warranty: {
    href: '/about',
    imageSrc: WHY_CHOOSE_US_PHOTO_SRC.warranty,
    imageWidth: 392,
    imageHeight: 406,
    heightClass: 'h-[406px]',
    objectPositionClass: 'object-bottom',
  },
  original: {
    href: '/shop',
    imageSrc: WHY_CHOOSE_US_PHOTO_SRC.original,
    imageWidth: 400,
    imageHeight: 540,
    heightClass: 'h-[540px]',
    objectPositionClass: 'object-bottom',
  },
};

function WhyChooseUsGlassCta({ label }: { readonly label: string }) {
  return (
    <span
      className={`pointer-events-none absolute bottom-[18px] left-1/2 flex h-12 ${WHY_CHOOSE_US_GLASS_PILL_WIDTH_CLASS} -translate-x-1/2 items-center gap-2 rounded-full border border-white/40 bg-white/30 pl-4 pr-1 backdrop-blur-[6px]`}
    >
      <span className="whitespace-nowrap px-1 text-center text-[14px] font-medium leading-none text-white">
        {label}
      </span>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white"
        aria-hidden
      >
        <HomeCtaPillArrowIcon className="size-[18px] text-[#1a1c1d]" />
      </span>
    </span>
  );
}

function WhyChooseUsBenefitCard({
  id,
  label,
}: {
  readonly id: BenefitId;
  readonly label: string;
}) {
  const card = BENEFIT_CARDS[id];

  return (
    <Link
      href={card.href}
      className={`group relative block w-full overflow-hidden ${WHY_CHOOSE_US_CARD_RADIUS_CLASS} ${card.heightClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2db2ff]`}
      aria-label={label}
    >
      <Image
        src={card.imageSrc}
        alt=""
        width={card.imageWidth}
        height={card.imageHeight}
        className={`size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${card.objectPositionClass}`}
        sizes="(min-width: 1024px) 400px, 100vw"
      />
      <WhyChooseUsGlassCta label={label} />
    </Link>
  );
}

function WhyChooseUsHeading({
  titleLead,
  titleEmphasis,
  subtitle,
}: {
  readonly titleLead: string;
  readonly titleEmphasis: string;
  readonly subtitle: string;
}) {
  return (
    <div className="mb-11 flex max-w-[538px] flex-col gap-[42px]">
      <h2
        id="why-choose-us-heading"
        className="text-[60px] leading-[60px] text-[#1a1c1d]"
      >
        <span className="font-light">{titleLead}</span>
        <span className="block font-bold">{titleEmphasis}</span>
      </h2>
      <p className="max-w-[416px] text-base font-normal leading-6 text-[#6b7280]">
        {subtitle}
      </p>
    </div>
  );
}

/**
 * Home “Why choose us” collage — Figma Mobee-Dev-Neew (~91:1521–91:1555).
 * Desktop-only (parent hides below `lg`).
 */
export function WhyChooseUsSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-white" aria-labelledby="why-choose-us-heading">
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} ${montserrat.className}`}>
        <div className="grid grid-cols-[minmax(0,375fr)_minmax(0,392fr)_minmax(0,400fr)] items-start gap-x-[50px]">
          <div className="pt-[62px]">
            <WhyChooseUsBenefitCard
              id="delivery"
              label={t('home.why_choose_us_benefits.delivery_title')}
            />
          </div>

          <div className="flex flex-col gap-[23px]">
            <WhyChooseUsBenefitCard
              id="installment"
              label={t('home.why_choose_us_benefits.installment_title')}
            />
            <WhyChooseUsBenefitCard
              id="warranty"
              label={t('home.why_choose_us_benefits.warranty_title')}
            />
          </div>

          <div className="flex flex-col">
            <WhyChooseUsHeading
              titleLead={t('home.why_choose_us_heading.title_lead')}
              titleEmphasis={t('home.why_choose_us_heading.title_emphasis')}
              subtitle={t('home.why_choose_us_heading.subtitle')}
            />
            <WhyChooseUsBenefitCard
              id="original"
              label={t('home.why_choose_us_benefits.original_title')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
