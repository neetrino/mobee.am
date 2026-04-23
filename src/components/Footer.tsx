'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { FooterLegalBar } from './FooterLegalBar';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { useFooterCategoryHrefs } from './useFooterCategoryHrefs';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const linkMuted =
  'block pb-[1.5px] pt-[5.5px] text-[16px] font-bold uppercase tracking-[0.55px] text-[#a1a1aa] transition-colors hover:text-gray-700';

const headingClass =
  'text-[16px] font-bold uppercase tracking-[0.55px] text-black leading-[16.5px]';

function SocialLink({ href, label }: { href: string; label: string }) {
  if (!href) {
    return <span className={linkMuted}>{label}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkMuted}
    >
      {label}
    </a>
  );
}

export function Footer() {
  const { t, lang } = useTranslation();
  const categoryHrefs = useFooterCategoryHrefs();
  const isArmenian = lang === 'hy';

  const addressText = t('contact.address');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

  const social = {
    instagram: t('contact.social.instagram'),
    facebook: t('contact.social.facebook'),
    telegram: t('contact.social.telegram'),
    whatsapp: t('contact.social.whatsapp'),
  };

  const sectionWrapperClass = isArmenian
    ? `${SITE_CONTENT_GUTTERS_CLASS} py-10 md:py-14 xl:py-20`
    : 'mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20';

  const sectionGridClass = isArmenian
    ? 'grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12 xl:grid-cols-[minmax(320px,427px)_1fr_repeat(3,minmax(120px,160px))] xl:gap-x-8 xl:gap-y-0'
    : 'grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-4 lg:gap-8';

  const rightColumnShiftClass = isArmenian ? 'xl:-translate-x-[15%]' : '';
  const rightColumnPaddingClass = isArmenian ? 'xl:pr-[5%]' : '';
  const productsColumnPaddingClass = isArmenian ? 'xl:pr-[15%]' : '';

  return (
    <footer className={`${montserrat.className} ${isArmenian ? 'bg-[#f3f4f6]' : 'border-t border-gray-200 bg-white'}`}>
      <div className={sectionWrapperClass}>
        <div className={sectionGridClass}>
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
                className={`object-cover object-center ${isArmenian ? 'grayscale opacity-50' : ''}`}
                sizes="(max-width: 768px) 100vw, 25vw"
              />
              {isArmenian ? <div aria-hidden="true" className="absolute inset-0 bg-white mix-blend-saturation" /> : null}
            </Link>
            <div className="text-[16px] leading-6 text-[#64748b] whitespace-pre-line">{addressText}</div>
          </div>

          {/* Products */}
          <div className={`flex flex-col gap-6 xl:col-start-3 ${rightColumnShiftClass} ${productsColumnPaddingClass}`}>
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
          <div className={`flex flex-col gap-6 xl:col-start-4 ${rightColumnShiftClass} ${rightColumnPaddingClass}`}>
            <h2 className={headingClass}>{t('common.footer.sectionsHeading')}</h2>
            <nav className="flex flex-col gap-4" aria-label={t('common.footer.sectionsHeading')}>
              <Link href="/shop" className={linkMuted}>
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
          <div className={`flex flex-col gap-6 xl:col-start-5 ${rightColumnShiftClass}`}>
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
