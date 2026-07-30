'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n-client';

const FOOTER_REFUND_POLICY_HREF = '/refund-policy';

const FOOTER_POLICY_LINKS_HIDDEN_ON_CART = new Set(['/delivery-terms', FOOTER_REFUND_POLICY_HREF]);

const CART_ROUTE_PATH = '/cart';

const FOOTER_POLICY_LINK_CLASS =
  'whitespace-nowrap text-[14px] font-medium text-black transition-opacity hover:opacity-70';

/** EN: wrap row; RU/HY: 2×2 grid with start-aligned cells. */
const FOOTER_POLICIES_NAV_ROW_CLASS =
  'flex flex-wrap items-center gap-x-8 gap-y-3 lg:justify-end';

const FOOTER_POLICIES_NAV_GRID_RU_CLASS =
  'grid grid-cols-2 gap-x-8 gap-y-3 lg:ml-auto lg:justify-items-start';

const FOOTER_POLICIES_NAV_GRID_HY_CLASS =
  'grid grid-cols-2 gap-x-[17px] gap-y-3 ml-auto justify-items-start';

type FooterPoliciesNavProps = {
  className?: string;
  /** Mobile home under SALE card — stacked framed links. */
  layout?: 'footer' | 'mobileHome';
};

/**
 * Legal / policy links shared by desktop footer and mobile home (under SALE card).
 */
export function FooterPoliciesNav({ className, layout = 'footer' }: FooterPoliciesNavProps) {
  const { t, lang } = useTranslation();
  const pathname = usePathname();

  const policyLinks = [
    { href: '/delivery-terms', label: t('common.footer.policiesRow.delivery') },
    { href: FOOTER_REFUND_POLICY_HREF, label: t('common.footer.policiesRow.refund') },
    { href: '/credit', label: t('common.footer.policiesRow.credit') },
    { href: '/terms', label: t('common.footer.policiesRow.terms') },
    { href: '/privacy', label: t('common.footer.policiesRow.privacy') },
  ].filter((link) =>
    pathname === CART_ROUTE_PATH ? !FOOTER_POLICY_LINKS_HIDDEN_ON_CART.has(link.href) : true,
  );

  const navClassName =
    layout === 'mobileHome'
      ? 'flex w-full flex-col gap-y-3'
      : lang === 'ru'
        ? FOOTER_POLICIES_NAV_GRID_RU_CLASS
        : lang === 'hy'
          ? FOOTER_POLICIES_NAV_GRID_HY_CLASS
          : FOOTER_POLICIES_NAV_ROW_CLASS;

  const useGridLinkAlign = layout === 'mobileHome' || lang === 'ru' || lang === 'hy';
  const isMobileHome = layout === 'mobileHome';

  return (
    <nav
      className={`${navClassName}${className ? ` ${className}` : ''}`}
      aria-label={t('common.footer.legalBar.policiesNavLabel')}
    >
      {policyLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            isMobileHome
              ? 'flex w-full items-center rounded-2xl border border-[#eeeef0] bg-[#f7f8fa] px-4 py-3.5 text-left text-[14px] font-medium leading-5 text-black transition-opacity hover:opacity-70'
              : `${FOOTER_POLICY_LINK_CLASS}${useGridLinkAlign ? ' !whitespace-normal text-left' : ''}`
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
