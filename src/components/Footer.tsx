'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';
import { Facebook, Instagram, MessageCircle, PhoneCall, Send } from 'lucide-react';
import { useTranslation } from '../lib/i18n-client';
import { FooterLegalBar } from './FooterLegalBar';
import { FooterPaymentMethodsRow } from './FooterPaymentMethodsRow';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const footerNavLinkClass = 'block text-[14px] leading-5 text-[#6b7280] transition-colors hover:text-[#111827]';

const headingClass =
  'text-[16px] font-bold uppercase tracking-[0.55px] text-black leading-[16.5px]';

type SocialIconLinkProps = {
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
};

function SocialIconLink({ href, label, icon }: SocialIconLinkProps) {
  if (!href || href.startsWith('contact.')) {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2db2ff] text-white/65"
        aria-label={label}
      >
        {icon}
      </span>
    );
  }

  const isExternal = href.startsWith('http');
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2db2ff] text-white transition-colors hover:bg-[#1a9ef0]"
      aria-label={label}
    >
      {icon}
    </Link>
  );
}

export function Footer() {
  const { t } = useTranslation();

  const addressText = t('contact.address');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
  const phoneText = t('contact.phone');
  const telHref = `tel:${phoneText.replace(/\s+/g, '')}`;

  const social = {
    instagram: t('contact.social.instagram'),
    facebook: t('contact.social.facebook'),
    telegram: t('contact.social.telegram'),
    whatsapp: t('contact.social.whatsapp'),
    phone: telHref,
  };

  const sectionLinks = [
    { href: '/about', label: t('common.navigation.about') },
    { href: '/shop', label: t('common.footer.shop') },
    { href: '/contact', label: t('common.navigation.contact') },
  ];

  const policyLinks = [
    { href: '/privacy', label: t('common.footer.legalBar.privacyPolicy') },
    { href: '/delivery-terms', label: t('common.footer.legalBar.shippingPolicy') },
    { href: '/returns', label: t('common.footer.legalBar.returnPolicy') },
    { href: '/terms', label: t('common.footer.legalBar.termsOfUse') },
  ];

  return (
    <footer
      className={`${montserrat.className} hidden border-t border-[#eee] bg-[#f3f4f6] lg:block`}
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-10 md:py-14 xl:py-8`}>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-10 md:gap-y-12 xl:grid-cols-[minmax(320px,427px)_minmax(160px,280px)_minmax(220px,283px)] xl:items-start xl:justify-between xl:gap-x-14">
          {/* Visit us */}
          <div className="flex flex-col gap-6 xl:col-start-1">
            <h2 className={headingClass}>{t('common.footer.visitUs')}</h2>
            <Link
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block h-[120px] w-full overflow-hidden rounded-xl bg-[#e2e8f0]"
              aria-label={t('common.footer.openInMaps')}
            >
              <Image
                src="/images/footer/visit-map.png"
                alt=""
                fill
                className="object-cover object-center grayscale opacity-50"
                sizes="(max-width: 768px) 100vw, 25vw"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-white mix-blend-saturation" />
            </Link>
            <div className="text-[16px] leading-6 text-[#64748b] whitespace-pre-line">{addressText}</div>
            <FooterPaymentMethodsRow />
          </div>

          <div className="flex flex-col gap-6 xl:col-start-2">
            <h2 className={headingClass}>{t('common.footer.sectionsHeading')}</h2>
            <nav className="flex flex-col gap-3" aria-label={t('common.footer.sectionsHeading')}>
              {sectionLinks.map((link) => (
                <Link key={link.href} href={link.href} className={footerNavLinkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-6 xl:col-start-3">
            <h2 className={headingClass}>{t('common.footer.termsHeading')}</h2>
            <nav className="flex flex-col gap-3" aria-label={t('common.footer.legalBar.policiesNavLabel')}>
              {policyLinks.map((link) => (
                <Link key={link.href} href={link.href} className={footerNavLinkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4 pt-1">
              <SocialIconLink href={social.instagram} label="Instagram" icon={<Instagram size={18} strokeWidth={2} />} />
              <SocialIconLink href={social.facebook} label="Facebook" icon={<Facebook size={18} strokeWidth={2} />} />
              <SocialIconLink href={social.telegram} label="Telegram" icon={<Send size={18} strokeWidth={2} />} />
              <SocialIconLink href={social.whatsapp} label="WhatsApp" icon={<MessageCircle size={18} strokeWidth={2} />} />
              <SocialIconLink href={social.phone} label={phoneText} icon={<PhoneCall size={18} strokeWidth={2} />} />
            </div>
          </div>
        </div>
      </div>

      <FooterLegalBar />
    </footer>
  );
}
