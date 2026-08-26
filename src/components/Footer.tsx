'use client';

import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { siteMontserrat } from '../lib/fonts/site-fonts';
import { useTranslation } from '../lib/i18n-client';
import { FOOTER_SOCIAL_BUTTON_SRC } from '../lib/constants/ui-icons.constants';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from '../lib/contactPhoneDisplay';
import { FooterPoliciesNav } from './footer/FooterPoliciesNav';
import { FooterPaymentMethodsRow } from './FooterPaymentMethodsRow';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { ContactMapEmbed } from './ContactMapEmbed';

const montserrat = siteMontserrat;

/** Footer credit company name links to Neetrino site. */
const FOOTER_CREDIT_COMPANY_HREF = 'https://neetrino.com/';

/** Figma mobee-new footer info (1:1477) — column heading. */
const FOOTER_COLUMN_HEADING_CLASS =
  'text-[16px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-black';

/** Section / policy link body — Figma gray. */
const FOOTER_SECTION_LINK_CLASS =
  'text-[14px] leading-5 text-[#6b7280] transition-colors hover:text-[#2db2ff]';

const FOOTER_MAP_SHELL_CLASS =
  'relative block min-h-[160px] w-full min-w-0 flex-1 overflow-hidden rounded-xl bg-[#e2e8f0]';

const FOOTER_SOCIAL_BUTTON_SIZE_PX = 40;

const FOOTER_SOCIAL_PHONE_BG_CLASS =
  'inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2db2ff] transition-opacity hover:opacity-80';

type SocialImageLinkProps = {
  readonly href: string;
  readonly label: string;
  readonly src: string;
};

function SocialImageLink({ href, label, src }: SocialImageLinkProps) {
  if (!href || href.startsWith('contact.')) {
    return (
      <span className="inline-flex size-10 opacity-35" aria-label={label}>
        <Image
          src={src}
          alt=""
          width={FOOTER_SOCIAL_BUTTON_SIZE_PX}
          height={FOOTER_SOCIAL_BUTTON_SIZE_PX}
          className="size-10"
          unoptimized
          aria-hidden
        />
      </span>
    );
  }

  const isExternal = href.startsWith('http');
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex size-10 shrink-0 transition-opacity hover:opacity-80"
      aria-label={label}
    >
      <Image
        src={src}
        alt=""
        width={FOOTER_SOCIAL_BUTTON_SIZE_PX}
        height={FOOTER_SOCIAL_BUTTON_SIZE_PX}
        className="size-10"
        unoptimized
        aria-hidden
      />
    </Link>
  );
}

function FooterVisitColumn({ addressText }: { readonly addressText: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full max-w-[427px] flex-col items-stretch gap-6">
      <h2 className={FOOTER_COLUMN_HEADING_CLASS}>{t('common.footer.visitUs')}</h2>
      <ContactMapEmbed addressText={addressText} shellClassName={FOOTER_MAP_SHELL_CLASS} />
      <p className="whitespace-nowrap text-[16px] leading-6 text-[#64748b]">{addressText}</p>
    </div>
  );
}

function FooterSectionsColumn() {
  const { t } = useTranslation();

  const sectionLinks = [
    { href: '/about', label: t('common.navigation.about') },
    { href: '/shop', label: t('common.footer.shop') },
    { href: '/contact', label: t('common.footer.sectionsContact') },
  ];

  return (
    <nav
      className="flex min-w-[129px] justify-self-center flex-col items-start gap-[27px]"
      aria-label={t('common.footer.footerNavAriaLabel')}
    >
      <h2 className={FOOTER_COLUMN_HEADING_CLASS}>{t('common.footer.sectionsHeading')}</h2>
      <ul className="flex flex-col items-start gap-3">
        {sectionLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={FOOTER_SECTION_LINK_CLASS}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterTermsAndSocialColumn({ phoneHref }: { readonly phoneHref: string }) {
  const { t } = useTranslation();

  const social = {
    instagram: t('contact.social.instagram'),
    facebook: t('contact.social.facebook'),
    telegram: t('contact.social.telegram'),
    whatsapp: t('contact.social.whatsapp'),
  };

  return (
    <div className="flex h-full flex-col items-start gap-10 lg:ml-auto lg:max-w-[389px]">
      <div className="flex w-full flex-col items-start gap-[27px]">
        <h2 className={FOOTER_COLUMN_HEADING_CLASS}>{t('common.footer.termsHeading')}</h2>
        <FooterPoliciesNav layout="footerStack" />
      </div>

      <div
        className="mt-auto flex items-center gap-4"
        aria-label={t('common.footer.socialNavAriaLabel')}
      >
        <SocialImageLink
          href={social.instagram}
          label="Instagram"
          src={FOOTER_SOCIAL_BUTTON_SRC.instagram}
        />
        <SocialImageLink
          href={social.facebook}
          label="Facebook"
          src={FOOTER_SOCIAL_BUTTON_SRC.facebook}
        />
        <SocialImageLink
          href={social.telegram}
          label="Telegram"
          src={FOOTER_SOCIAL_BUTTON_SRC.telegram}
        />
        <SocialImageLink
          href={social.whatsapp}
          label="WhatsApp"
          src={FOOTER_SOCIAL_BUTTON_SRC.whatsapp}
        />
        <Link href={phoneHref} className={FOOTER_SOCIAL_PHONE_BG_CLASS} aria-label="Phone">
          <Image
            src={FOOTER_SOCIAL_BUTTON_SRC.phoneGlyph}
            alt=""
            width={20}
            height={22}
            className="h-[22px] w-5"
            unoptimized
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

/**
 * Bottom legal bar — Figma mobee-new HorizontalBorder (node 1:1509).
 * MOBEE + copyright · payment logos.
 */
function FooterLegalBar() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const copyrightLead = t('common.footer.legalBar.copyrightLead').replace('{year}', String(year));

  return (
    <div className="border-t border-[#eeeef0] pt-[33px]">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
        <div className="flex min-w-0 flex-wrap items-center gap-[17px]">
          <p className="shrink-0 text-[18px] font-black leading-7 text-black">
            {t('common.footer.legalBar.brand')}
          </p>
          <p className="min-w-0 text-[16px] leading-5 text-[#a1a1aa]">
            <span>{copyrightLead} </span>
            <span>{t('common.footer.legalBar.createdBy')} </span>
            <Link
              href={FOOTER_CREDIT_COMPANY_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#a1a1aa] transition-opacity hover:opacity-80"
            >
              {t('common.footer.legalBar.creditCompany')}
            </Link>
          </p>
        </div>
        <FooterPaymentMethodsRow />
      </div>
    </div>
  );
}

/**
 * Desktop storefront footer — Figma mobee-new «footer info» (1:1477) + legal bar (1:1509).
 */
export function Footer() {
  const { t } = useTranslation();

  const addressText = t('contact.address');
  const phoneLines = splitContactPhoneDisplay(t('contact.phone'));
  const phoneHref = phoneLines[0] ? phoneDisplayToTelHref(phoneLines[0]) : 'tel:';

  return (
    <footer
      className={`${montserrat.className} hidden border-t border-[#eee] bg-white pb-8 pt-8 lg:block`}
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} flex flex-col gap-8`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-x-12 gap-y-10 xl:gap-x-20">
          <FooterVisitColumn addressText={addressText} />
          <FooterSectionsColumn />
          <FooterTermsAndSocialColumn phoneHref={phoneHref} />
        </div>
        <FooterLegalBar />
      </div>
    </footer>
  );
}
