'use client';

import { Link } from '@/lib/i18n/navigation';
import { usePathname } from 'next/navigation';
import { stripLocalePrefix } from '@/lib/i18n/routing';
import { useTranslation } from '@/lib/i18n-client';
import {
  MOBILE_DRAWER_NAV_BUTTON_CLASS,
  MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS,
} from '@/components/mobile-drawer-nav.constants';

const FOOTER_REFUND_POLICY_HREF = '/refund-policy';

const FOOTER_POLICY_LINKS_HIDDEN_ON_CART = new Set(['/delivery-terms', FOOTER_REFUND_POLICY_HREF]);

const CART_ROUTE_PATH = '/cart';

const FOOTER_POLICY_LINK_CLASS =
  'whitespace-nowrap text-[14px] font-medium text-black transition-opacity hover:opacity-70';

/** Desktop footer Terms column — Figma 1:1477. */
const FOOTER_POLICY_STACK_LINK_CLASS =
  'text-[14px] leading-[30px] text-[#6b7280] transition-colors hover:text-[#2db2ff]';

/** EN: wrap row. */
const FOOTER_POLICIES_NAV_ROW_CLASS =
  'flex flex-wrap items-center gap-x-8 gap-y-3 lg:justify-end';

/** RU/HY: 2 columns — left 2 links, right 3 links. */
const FOOTER_POLICIES_NAV_GRID_RU_CLASS =
  'flex items-start gap-x-8 lg:ml-auto';

const FOOTER_POLICIES_NAV_GRID_HY_CLASS =
  'flex items-start gap-x-[17px] ml-auto';

const FOOTER_POLICIES_COLUMN_CLASS = 'flex flex-col gap-y-3';

const FOOTER_POLICIES_STACK_CLASS = 'flex flex-col items-start';

const FOOTER_POLICIES_DRAWER_CLASS = 'flex w-full flex-col gap-2';

const FOOTER_POLICY_DRAWER_LINK_CLASS = `${MOBILE_DRAWER_NAV_BUTTON_CLASS} normal-case font-medium text-gray-800 hover:!border-admin-300 hover:!bg-admin-50 hover:!text-[#00a1ff]`;

type PolicyLink = {
  href: string;
  label: string;
};

type FooterPoliciesNavProps = {
  className?: string;
  /**
   * `footer` — legacy legal bar (row / 2-col).
   * `footerStack` — Figma Terms column (single vertical list).
   * `mobileDrawer` — Header mobile side menu.
   */
  layout?: 'footer' | 'footerStack' | 'mobileDrawer';
  /** Called when a policy link is activated (e.g. close mobile drawer). */
  onNavigate?: () => void;
};

/**
 * Legal / policy links — desktop footer Terms column and mobile drawer.
 */
export function FooterPoliciesNav({
  className,
  layout = 'footer',
  onNavigate,
}: FooterPoliciesNavProps) {
  const { t, lang } = useTranslation();
  const pathname = stripLocalePrefix(usePathname());

  const isVisibleOnCurrentRoute = (href: string): boolean =>
    pathname === CART_ROUTE_PATH ? !FOOTER_POLICY_LINKS_HIDDEN_ON_CART.has(href) : true;

  const leftColumnLinks: PolicyLink[] = [
    { href: '/delivery-terms', label: t('common.footer.policiesRow.delivery') },
    { href: FOOTER_REFUND_POLICY_HREF, label: t('common.footer.policiesRow.refund') },
  ].filter((link) => isVisibleOnCurrentRoute(link.href));

  const rightColumnLinks: PolicyLink[] = [
    { href: '/credit', label: t('common.footer.policiesRow.credit') },
    { href: '/terms', label: t('common.footer.policiesRow.terms') },
    { href: '/privacy', label: t('common.footer.policiesRow.privacy') },
  ].filter((link) => isVisibleOnCurrentRoute(link.href));

  const allPolicyLinks = [...leftColumnLinks, ...rightColumnLinks];
  const isMobileDrawer = layout === 'mobileDrawer';
  const isFooterStack = layout === 'footerStack';
  const useColumnLayout = !isMobileDrawer && !isFooterStack && (lang === 'ru' || lang === 'hy');

  const navClassName = isMobileDrawer
    ? FOOTER_POLICIES_DRAWER_CLASS
    : isFooterStack
      ? FOOTER_POLICIES_STACK_CLASS
      : lang === 'ru'
        ? FOOTER_POLICIES_NAV_GRID_RU_CLASS
        : lang === 'hy'
          ? FOOTER_POLICIES_NAV_GRID_HY_CLASS
          : FOOTER_POLICIES_NAV_ROW_CLASS;

  const renderLink = (link: PolicyLink) => {
    let linkClassName = FOOTER_POLICY_LINK_CLASS;
    if (isMobileDrawer) {
      linkClassName = FOOTER_POLICY_DRAWER_LINK_CLASS;
    } else if (isFooterStack) {
      linkClassName = FOOTER_POLICY_STACK_LINK_CLASS;
    } else if (useColumnLayout) {
      linkClassName = `${FOOTER_POLICY_LINK_CLASS} !whitespace-normal text-left`;
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        className={linkClassName}
        onClick={onNavigate}
      >
        {isMobileDrawer ? (
          <span className={`${MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS} text-left`}>{link.label}</span>
        ) : (
          link.label
        )}
      </Link>
    );
  };

  return (
    <nav
      className={`${navClassName}${className ? ` ${className}` : ''}`}
      aria-label={t('common.footer.legalBar.policiesNavLabel')}
    >
      {useColumnLayout ? (
        <>
          {leftColumnLinks.length > 0 ? (
            <div className={FOOTER_POLICIES_COLUMN_CLASS}>{leftColumnLinks.map(renderLink)}</div>
          ) : null}
          {rightColumnLinks.length > 0 ? (
            <div className={FOOTER_POLICIES_COLUMN_CLASS}>{rightColumnLinks.map(renderLink)}</div>
          ) : null}
        </>
      ) : (
        allPolicyLinks.map(renderLink)
      )}
    </nav>
  );
}
