'use client';

import Link from 'next/link';
import {
  forwardRef,
  startTransition,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { adminNavMarkClick } from '@/lib/admin/admin-nav-debug';
import { useAdminNav } from './AdminNavProvider';

type AdminSidebarNavLinkProps = {
  href: string;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'aria-current'?: 'page' | undefined;
  children: ReactNode;
  onAfterNavigate?: () => void;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

/**
 * Admin sidebar nav row — Link prefetch + API warm + optimistic navigation.
 */
export const AdminSidebarNavLink = forwardRef<HTMLAnchorElement, AdminSidebarNavLinkProps>(
  function AdminSidebarNavLink(
    {
      href,
      className,
      title,
      'aria-label': ariaLabel,
      'aria-current': ariaCurrent,
      children,
      onAfterNavigate,
    },
    ref,
  ) {
    const { beginAdminNavigation, prefetchAdminNavigation, router } = useAdminNav();

    const warm = () => {
      prefetchAdminNavigation(href);
    };

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (isModifiedClick(event)) {
        return;
      }

      event.preventDefault();
      adminNavMarkClick(href);
      beginAdminNavigation(href);
      onAfterNavigate?.();
      startTransition(() => {
        router.push(href);
      });
    };

    return (
      <Link
        ref={ref}
        href={href}
        prefetch
        scroll={false}
        className={className}
        title={title}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
        onPointerDown={warm}
        onMouseEnter={warm}
        onFocus={warm}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  },
);
