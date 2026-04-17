'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { FooterLegalBar } from './FooterLegalBar';
import { useFooterCategoryHrefs } from './useFooterCategoryHrefs';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const linkMuted =
  'text-[16px] font-bold uppercase tracking-[0.55px] text-[#a1a1aa] transition-colors hover:text-gray-700';

const headingClass =
  'text-[16px] font-bold uppercase tracking-[0.55px] text-black leading-[16.5px]';

function SocialLink({ href, label }: { href: string; label: string }) {
  if (!href) {
    return <span className={`${linkMuted} block py-[5.5px] pb-[1.5px]`}>{label}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${linkMuted} block py-[5.5px] pb-[1.5px]`}
    >
      {label}
    </a>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const categoryHrefs = useFooterCategoryHrefs();

  const addressText = t('contact.address');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

  const social = {
    instagram: t('contact.social.instagram'),
    facebook: t('contact.social.facebook'),
    telegram: t('contact.social.telegram'),
    whatsapp: t('contact.social.whatsapp'),
  };

  return (
    <footer className={`${montserrat.className} border-t border-gray-200 bg-white`}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-4 lg:gap-8">
          {/* Visit us */}
          <div className="flex flex-col gap-6">
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
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 25vw"
              />
            </Link>
            <div className="text-[16px] leading-6 text-[#64748b] whitespace-pre-line">{addressText}</div>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-6">
            <h2 className={headingClass}>{t('common.footer.productsHeading')}</h2>
            <nav className="flex flex-col gap-4" aria-label={t('common.footer.productsHeading')}>
              <Link href={categoryHrefs.phones} className={linkMuted}>
                {t('common.mainHeader.phonesLink')}
              </Link>
              <Link href={categoryHrefs.computers} className={linkMuted}>
                {t('common.mainHeader.computersLink')}
              </Link>
              <Link href={categoryHrefs.tablets} className={linkMuted}>
                {t('common.mainHeader.tabletsLink')}
              </Link>
              <Link href={categoryHrefs.watches} className={linkMuted}>
                {t('common.mainHeader.watchesLink')}
              </Link>
              <Link href={categoryHrefs.accessories} className={linkMuted}>
                {t('common.mainHeader.accessoriesLink')}
              </Link>
            </nav>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-6">
            <h2 className={headingClass}>{t('common.footer.sectionsHeading')}</h2>
            <nav className="flex flex-col gap-4" aria-label={t('common.footer.sectionsHeading')}>
              <Link href="/products" className={linkMuted}>
                {t('common.footer.shop')}
              </Link>
              <Link href="/about" className={linkMuted}>
                {t('common.navigation.about')}
              </Link>
              <Link href="/contact" className={linkMuted}>
                {t('common.navigation.contact')}
              </Link>
              <Link href="/faq" className={linkMuted}>
                {t('common.navigation.faq')}
              </Link>
            </nav>
          </div>

          {/* Connect / social */}
          <div className="flex flex-col gap-6">
            <h2 className={headingClass}>{t('common.footer.connectHeading')}</h2>
            <div className="flex flex-col gap-4">
              <SocialLink href={social.instagram} label="Instagram" />
              <SocialLink href={social.facebook} label="Facebook" />
              <SocialLink href={social.telegram} label="Telegram" />
              <SocialLink href={social.whatsapp} label="WhatsApp" />
            </div>
          </div>
        </div>
      </div>

      <FooterLegalBar />
    </footer>
  );
}
