'use client';

import { Link } from '@/lib/i18n/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import type { ReactNode } from 'react';
import { getStoredLanguage } from '@/lib/language';
import { warmShopCategoryNavigation } from '@/lib/navigation/storefront-prefetch';

type CategoryStripLinkProps = {
  href: string;
  categorySlug: string;
  className?: string;
  children: ReactNode;
};

export function CategoryStripLink({
  href,
  categorySlug,
  className,
  children,
}: CategoryStripLinkProps) {
  const router = useRouter();

  const warm = () => {
    warmShopCategoryNavigation(router, categorySlug, getStoredLanguage());
  };

  return (
    <Link
      href={href}
      prefetch
      className={className}
      onPointerDown={warm}
      onMouseEnter={warm}
      onFocus={warm}
    >
      {children}
    </Link>
  );
}
