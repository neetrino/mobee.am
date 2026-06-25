'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { ProductCardCachePayload } from '@/lib/products/product-card-cache';
import { buildProductCardNavHandlers } from '@/lib/products/product-card-nav';

type ProductCardNavLinkProps = {
  slug: string;
  cachePayload: ProductCardCachePayload;
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
};

export function ProductCardNavLink({
  slug,
  cachePayload,
  className,
  'aria-label': ariaLabel,
  children,
}: ProductCardNavLinkProps) {
  const router = useRouter();
  const warmHandlers = buildProductCardNavHandlers(cachePayload, router);

  return (
    <Link
      href={`/products/${slug}`}
      prefetch
      className={className}
      aria-label={ariaLabel}
      {...warmHandlers}
    >
      {children}
    </Link>
  );
}
