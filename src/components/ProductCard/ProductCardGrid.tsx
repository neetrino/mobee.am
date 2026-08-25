'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { InstallmentRequestModal } from './InstallmentRequestModal';
import { ProductCardGridDesktop } from './ProductCardGridDesktop';
import { ProductCardGridMobile } from './ProductCardGridMobile';
import type { ProductCardGridProps } from './productCardGrid.types';

export type { ProductCardGridProps } from './productCardGrid.types';

/**
 * Grid product card — legacy layout below `lg`, Figma redesign at `lg+`.
 */
export function ProductCardGrid(props: ProductCardGridProps) {
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const productHasPrice = props.product.hasPrice ?? (props.product.price != null && props.product.price > 0);

  const handleInstallmentClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsInstallmentModalOpen(true);
  };

  return (
    <>
      <div className="h-full min-h-0 lg:hidden">
        <ProductCardGridMobile {...props} onInstallmentOpen={handleInstallmentClick} />
      </div>
      <div className="hidden h-full min-h-0 lg:block">
        <ProductCardGridDesktop
          {...props}
          onInstallmentClick={handleInstallmentClick}
        />
      </div>
      {productHasPrice && props.product.price != null ? (
        <InstallmentRequestModal
          isOpen={isInstallmentModalOpen}
          onClose={() => setIsInstallmentModalOpen(false)}
          productId={props.product.id}
          productSlug={props.product.slug}
          productTitle={props.product.title}
          productPrice={props.product.price}
          currency="AMD"
          productImageUrl={props.product.image}
        />
      ) : null}
    </>
  );
}
