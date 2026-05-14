'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { useTranslation } from '../lib/i18n-client';
import {
  FooterContactLocationGlyph,
  FooterContactMailGlyph,
  FooterContactPhoneGlyph,
} from './footer/footerContactGlyphs';
import {
  FooterSocialFacebookGlyph,
  FooterSocialInstagramGlyph,
  FooterSocialTelegramGlyph,
  FooterSocialWhatsAppGlyph,
} from './footer/footerSocialGlyphs';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from '../lib/contactPhoneDisplay';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700', '900'],
  display: 'swap',
});

/** Footer credit company name links to Neetrino site. */
const FOOTER_CREDIT_COMPANY_HREF = 'https://neetrino.com/';

/** Address lines sit slightly below the location icon baseline. */
const FOOTER_ADDRESS_BODY_TOP_OFFSET_CLASS = 'pt-[8px]';

/** Phone / mail / address text columns — same left nudge next to icons. */
const FOOTER_CONTACT_TEXT_NUDGE_LEFT_CLASS = 'lg:-translate-x-[13px]';

/** Phone + email body only — shift text right (px); icons unchanged. */
const FOOTER_PHONE_EMAIL_TEXT_NUDGE_RIGHT_CLASS = 'pl-[5px]';

/** At `xl+` only — address column sits beside phone+mail (Figma); nudge toward map. */
const FOOTER_ADDRESS_ROW_NUDGE_XL_CLASS = 'xl:-translate-x-[20px]';

/** Desktop (`xl+`): raise address block 10px (margin avoids transform conflicts with nested nudges). */
const FOOTER_ADDRESS_COLUMN_OFFSET_UP_XL_CLASS = 'xl:-mt-[6px]';

/** Space under location title block before phone / mail / address (Figma-tuned). */
const FOOTER_LOCATION_HEADING_TO_CONTACTS_GAP_CLASS = 'gap-20 lg:gap-24';

/** Location block title — default (en/ru), Figma mobee-new. */
const FOOTER_LOCATION_HEADING_SIZE_DEFAULT_CLASS =
  'text-3xl font-black uppercase leading-none text-black md:text-4xl lg:text-[52px]';

/** HY: smaller on tablet / iPad Pro (`lg`–`max-xl`); full size from `xl` (Figma). */
const FOOTER_LOCATION_HEADING_SIZE_HY_CLASS =
  '-translate-x-[5px] text-[1.375rem] font-black uppercase leading-none tracking-[-0.025em] text-black sm:text-2xl md:text-[1.875rem] lg:text-[2rem] xl:text-[42px]';

/** Location card + map shell — light gray (Figma mobee-new footer reference). */
const FOOTER_LOCATION_SURFACE_BG_CLASS = 'bg-[#f9f9f9]';

/** Outer border matches product grid cards (`border-[#f3f4f6]`); no shadow per design. */
const FOOTER_CARD_CLASS = `rounded-[40px] border border-[#f3f4f6] ${FOOTER_LOCATION_SURFACE_BG_CLASS} p-6 md:p-8 lg:flex lg:items-stretch lg:gap-10 lg:p-4 lg:pl-14 xl:pl-16`;

const FOOTER_MAP_EMBED_SHELL_BASE_CLASS = `relative mt-8 block h-[220px] w-full min-w-0 shrink-0 overflow-hidden rounded-[26px] ${FOOTER_LOCATION_SURFACE_BG_CLASS} lg:h-[262px] lg:w-[min(100%,707px)] lg:max-w-[52%] lg:max-xl:-translate-x-[39px] xl:-translate-x-[45px]`;

/** Map top spacing — same for all locales (previously HY-only tune). */
const FOOTER_MAP_MARGIN_TOP_CLASS = 'lg:max-xl:mt-[calc(1.5rem+10px)] xl:mt-[19px]';

/** Google Maps embed from address (no API key). */
function footerGoogleMapsEmbedSrc(addressQuery: string): string {
  const q = encodeURIComponent(addressQuery);
  return `https://www.google.com/maps?q=${q}&z=15&output=embed`;
}

const FOOTER_NAV_LINK_CLASS =
  'px-6 py-2.5 text-[14px] font-bold leading-7 tracking-[0.2px] text-black transition-colors hover:text-[#00a1ff]';

const FOOTER_POLICY_LINK_CLASS =
  'whitespace-nowrap text-[14px] font-medium text-black transition-opacity hover:opacity-70';

const FOOTER_POLICIES_NAV_ROW_CLASS =
  'flex flex-wrap items-center gap-x-8 gap-y-3 lg:justify-end';

/** RU: 2×2 grid; row-major — row1: delivery | refund, row2: terms | privacy; cells start-aligned. */
const FOOTER_POLICIES_NAV_GRID_RU_CLASS =
  'grid grid-cols-2 gap-x-8 gap-y-3 lg:ml-auto lg:justify-items-start';

/** HY: same 2x2 grid; policy labels in each column share the same start edge. */
const FOOTER_POLICIES_NAV_GRID_HY_CLASS =
  'grid grid-cols-2 gap-x-[17px] gap-y-3 ml-auto justify-items-start';

const FOOTER_REFUND_POLICY_HREF = '/refund-policy';

/** 24px tap target; glyph draws at 22px inside (see footerSocialGlyphs GLYPH_CLASS). */
const FOOTER_SOCIAL_ICON_SLOT_CLASS =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-visible';

type SocialIconLinkProps = {
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
};

function SocialIconLink({ href, label, icon }: SocialIconLinkProps) {
  if (!href || href.startsWith('contact.')) {
    return (
      <span className="inline-flex text-black/35" aria-label={label}>
        <span className={FOOTER_SOCIAL_ICON_SLOT_CLASS}>{icon}</span>
      </span>
    );
  }

  const isExternal = href.startsWith('http');
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex overflow-visible text-black transition-opacity hover:opacity-70"
      aria-label={label}
    >
      <span className={FOOTER_SOCIAL_ICON_SLOT_CLASS}>{icon}</span>
    </Link>
  );
}

type ContactBlockProps = {
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  /** Multiline body (e.g. address) — top-align icon with first line. */
  readonly alignIconTop?: boolean;
  /** Extra classes on the text column (e.g. address vertical nudge). */
  readonly bodyClassName?: string;
};

function ContactIconBlock({ icon, children, className, alignIconTop = false, bodyClassName }: ContactBlockProps) {
  const rowAlign = alignIconTop ? 'items-start' : 'items-center';

  return (
    <div className={`flex min-w-0 gap-3 ${rowAlign} ${className ?? ''}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-[5px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-black">
        {icon}
      </div>
      <div
        className={`min-w-0 text-[16px] leading-6 tracking-[-0.3125px] text-[#070707] ${bodyClassName ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}

function FooterMapEmbed({ addressText }: { readonly addressText: string }) {
  const { t } = useTranslation();
  const embedSrc = footerGoogleMapsEmbedSrc(addressText);

  return (
    <div className={`${FOOTER_MAP_EMBED_SHELL_BASE_CLASS} ${FOOTER_MAP_MARGIN_TOP_CLASS}`}>
      <iframe
        title={t('common.footer.mapEmbedTitle')}
        src={embedSrc}
        className="pointer-events-auto absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

function FooterLocationCard(props: {
  readonly addressText: string;
  readonly phoneLines: readonly string[];
  readonly email: string;
}) {
  const { t, lang } = useTranslation();
  const { addressText, phoneLines, email } = props;
  const mailHref = `mailto:${email}`;

  return (
    <div className={FOOTER_CARD_CLASS}>
      <div className={`flex min-w-0 flex-1 flex-col lg:py-4 ${FOOTER_LOCATION_HEADING_TO_CONTACTS_GAP_CLASS}`}>
        <div>
          <h2
            className={
              lang === 'hy' ? FOOTER_LOCATION_HEADING_SIZE_HY_CLASS : FOOTER_LOCATION_HEADING_SIZE_DEFAULT_CLASS
            }
          >
            {t('common.footer.locationHeading')}
          </h2>
          <p className="mt-2 text-[14px] leading-5 text-black">{t('common.footer.locationSubtitle')}</p>
        </div>

        {/*
          Below `xl`: single column — phone, email, address (iPad Pro gets address under email).
          `xl+`: Figma 582 — phone + mail column; address row-span beside.
        */}
        <div className="grid grid-cols-1 gap-y-3.5 xl:grid-cols-[auto_1fr] xl:grid-rows-[auto_auto] xl:gap-x-14 xl:gap-y-3.5 xl:-translate-x-2.5">
          <ContactIconBlock
            className="xl:col-start-1 xl:row-start-1"
            bodyClassName={`${FOOTER_CONTACT_TEXT_NUDGE_LEFT_CLASS} ${FOOTER_PHONE_EMAIL_TEXT_NUDGE_RIGHT_CLASS}`}
            icon={<FooterContactPhoneGlyph />}
          >
            <div className="flex flex-col gap-0.5 tabular-nums">
              {phoneLines.map((line) => (
                <Link
                  key={line}
                  href={phoneDisplayToTelHref(line)}
                  className="block text-[16px] leading-6 tracking-[-0.3125px] hover:underline"
                >
                  {line}
                </Link>
              ))}
            </div>
          </ContactIconBlock>
          <ContactIconBlock
            className="xl:col-start-1 xl:row-start-2"
            bodyClassName={`${FOOTER_CONTACT_TEXT_NUDGE_LEFT_CLASS} ${FOOTER_PHONE_EMAIL_TEXT_NUDGE_RIGHT_CLASS}`}
            icon={<FooterContactMailGlyph />}
          >
            <Link href={mailHref} className="hover:underline">
              {email}
            </Link>
          </ContactIconBlock>
          <ContactIconBlock
            alignIconTop
            bodyClassName={`${FOOTER_ADDRESS_BODY_TOP_OFFSET_CLASS} ${FOOTER_CONTACT_TEXT_NUDGE_LEFT_CLASS} max-xl:pl-[5px]`}
            className={`xl:col-start-2 xl:row-span-2 xl:row-start-1 ${FOOTER_ADDRESS_COLUMN_OFFSET_UP_XL_CLASS} ${FOOTER_ADDRESS_ROW_NUDGE_XL_CLASS}`}
            icon={<FooterContactLocationGlyph className="size-6" />}
          >
            <p className="whitespace-pre-line">{addressText}</p>
          </ContactIconBlock>
        </div>
      </div>

      <FooterMapEmbed addressText={addressText} />
    </div>
  );
}

function FooterNavAndSocialRow() {
  const { t } = useTranslation();

  const social = {
    instagram: t('contact.social.instagram'),
    facebook: t('contact.social.facebook'),
    telegram: t('contact.social.telegram'),
    whatsapp: t('contact.social.whatsapp'),
  };

  const primaryLinks = [
    { href: '/', label: t('common.navigation.home') },
    { href: '/shop', label: t('common.navigation.products') },
    { href: '/about', label: t('common.navigation.about') },
    { href: '/contact', label: t('common.navigation.contact') },
  ];

  return (
    <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-center">
      <nav
        className="flex flex-wrap justify-center gap-1 md:justify-start lg:-translate-x-[23px]"
        aria-label={t('common.footer.footerNavAriaLabel')}
      >
        {primaryLinks.map((link) => (
          <Link key={link.href} href={link.href} className={FOOTER_NAV_LINK_CLASS}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-10" aria-label={t('common.footer.socialNavAriaLabel')}>
        <SocialIconLink href={social.facebook} label="Facebook" icon={<FooterSocialFacebookGlyph />} />
        <SocialIconLink href={social.instagram} label="Instagram" icon={<FooterSocialInstagramGlyph />} />
        <SocialIconLink href={social.telegram} label="Telegram" icon={<FooterSocialTelegramGlyph />} />
        <SocialIconLink href={social.whatsapp} label="WhatsApp" icon={<FooterSocialWhatsAppGlyph />} />
      </div>
    </div>
  );
}

function FooterCopyrightPoliciesRow() {
  const { t, lang } = useTranslation();

  const policyLinks = [
    { href: '/delivery-terms', label: t('common.footer.policiesRow.delivery') },
    { href: FOOTER_REFUND_POLICY_HREF, label: t('common.footer.policiesRow.refund') },
    { href: '/terms', label: t('common.footer.policiesRow.terms') },
    { href: '/privacy', label: t('common.footer.policiesRow.privacy') },
  ];

  const year = new Date().getFullYear();
  const copyrightLead = t('common.footer.copyrightIntro').replace('{year}', String(year));

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
      <p className="max-w-xl text-[16px] leading-5 text-black/75">
        <span>{copyrightLead} </span>
        <Link
          href={FOOTER_CREDIT_COMPANY_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[18px] font-black text-[#00a1ff] underline-offset-2 transition-opacity hover:opacity-80 hover:underline"
        >
          {t('common.footer.legalBar.creditCompany')}.
        </Link>
        <span>{' '}</span>
        <span>{t('common.footer.allRightsReserved')}</span>
      </p>
      <nav
        className={
          lang === 'ru' ? FOOTER_POLICIES_NAV_GRID_RU_CLASS : lang === 'hy' ? FOOTER_POLICIES_NAV_GRID_HY_CLASS : FOOTER_POLICIES_NAV_ROW_CLASS
        }
        aria-label={t('common.footer.legalBar.policiesNavLabel')}
      >
        {policyLinks.map((link) => {
          const gridPolicyLinkClass =
            lang === 'ru' || lang === 'hy' ? ' !whitespace-normal text-left' : '';
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${FOOTER_POLICY_LINK_CLASS}${gridPolicyLinkClass}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function FooterMetaSection() {
  return (
    <div>
      <FooterNavAndSocialRow />
      <div className="my-10 h-px w-full bg-[#e8e8e8] md:my-12" />
      <FooterCopyrightPoliciesRow />
    </div>
  );
}

export function Footer() {
  const { t } = useTranslation();

  const addressText = t('contact.address');
  const phoneLines = splitContactPhoneDisplay(t('contact.phone'));
  const email = t('contact.email');

  return (
    <footer
      className={`${inter.className} hidden border-t border-[#eee] bg-white pb-10 pt-10 md:pb-14 md:pt-12 lg:block lg:pb-16 lg:pt-14`}
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} flex flex-col gap-12 lg:gap-16`}>
        <FooterLocationCard
          addressText={addressText}
          phoneLines={phoneLines}
          email={email}
        />
        <FooterMetaSection />
      </div>
    </footer>
  );
}
