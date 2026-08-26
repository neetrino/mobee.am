'use client';

import { Link } from '@/lib/i18n/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import type { ReactNode } from 'react';
import type { ProductCardCachePayload } from '@/lib/products/product-card-cache';
import { buildProductCardNavHandlers } from '@/lib/products/product-card-nav';
import { buildProductPageHref } from '@/lib/products/product-page-href';

type ProductCardNavLinkProps = {
  slug: string;
  cachePayload: ProductCardCachePayload;
  linkColor?: string | null;
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
};

export function ProductCardNavLink({
  slug,
  cachePayload,
  linkColor = null,
  className,
  'aria-label': ariaLabel,
  children,
}: ProductCardNavLinkProps) {
  const router = useRouter();
  const warmHandlers = buildProductCardNavHandlers(cachePayload, router, linkColor);

  return (
    <Link
      href={buildProductPageHref(slug, { color: linkColor })}
      prefetch
      className={className}
      aria-label={ariaLabel}
      {...warmHandlers}
    >
      {children}
    </Link>
  );
}
