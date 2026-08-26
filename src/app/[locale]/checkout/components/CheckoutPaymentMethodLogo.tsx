'use client';

import { useState } from 'react';
import type { PaymentMethodId } from '../utils/payment-methods';
import { PAYMENT_ICON_SRC } from '../../../../lib/constants/ui-icons.constants';
import {
  CHECKOUT_PAYMENT_LOGO_IMG_CLASS,
  CHECKOUT_PAYMENT_LOGO_IMG_CLASS_APARIK,
  CHECKOUT_PAYMENT_LOGO_IMG_CLASS_ARCA,
  CHECKOUT_PAYMENT_LOGO_SLOT_CLASS,
  CHECKOUT_PAYMENT_CARD_BRANDS_ROW_CLASS,
  CHECKOUT_PAYMENT_CARD_BRAND_CHIP_CLASS,
  CHECKOUT_PAYMENT_CARD_BRAND_IMG_CLASS,
  CHECKOUT_PAYMENT_CARD_BRAND_ARCA_IMG_CLASS,
  CHECKOUT_PAYMENT_CARD_BRAND_MASTERCARD_IMG_CLASS,
  CHECKOUT_PAYMENT_CARD_BRAND_VISA_IMG_CLASS,
} from '../constants';

function getCardBrandImgClass(brandId: string): string {
  if (brandId === 'arca') {
    return CHECKOUT_PAYMENT_CARD_BRAND_ARCA_IMG_CLASS;
  }
  if (brandId === 'mastercard') {
    return CHECKOUT_PAYMENT_CARD_BRAND_MASTERCARD_IMG_CLASS;
  }
  if (brandId === 'visa') {
    return CHECKOUT_PAYMENT_CARD_BRAND_VISA_IMG_CLASS;
  }
  return CHECKOUT_PAYMENT_CARD_BRAND_IMG_CLASS;
}

interface CheckoutPaymentMethodLogoProps {
  methodId: PaymentMethodId;
  logo: string | null;
  name: string;
  logoErrors: Record<string, boolean>;
  onLogoError: (methodId: PaymentMethodId) => void;
}

const CARD_BRAND_LOGOS = [
  { id: 'visa', src: PAYMENT_ICON_SRC.visa, alt: 'Visa' },
  { id: 'mastercard', src: PAYMENT_ICON_SRC.mastercard, alt: 'Mastercard' },
  { id: 'arca', src: PAYMENT_ICON_SRC.arca, alt: 'ArCa' },
] as const;

function PaymentFallbackIcon() {
  return (
    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function CardBrandsLogo() {
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const visibleBrands = CARD_BRAND_LOGOS.filter((brand) => !failedIds.has(brand.id));

  if (visibleBrands.length === 0) {
    return <PaymentFallbackIcon />;
  }

  return (
    <div className={CHECKOUT_PAYMENT_CARD_BRANDS_ROW_CLASS}>
      {visibleBrands.map((brand) => (
        <div key={brand.id} className={CHECKOUT_PAYMENT_CARD_BRAND_CHIP_CLASS}>
          <img
            src={brand.src}
            alt={brand.alt}
            className={getCardBrandImgClass(brand.id)}
            loading="lazy"
            onError={() => {
              setFailedIds((prev) => new Set(prev).add(brand.id));
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function CheckoutPaymentMethodLogo({
  methodId,
  logo,
  name,
  logoErrors,
  onLogoError,
}: CheckoutPaymentMethodLogoProps) {
  if (methodId === 'arca' && !logoErrors.arca) {
    return <CardBrandsLogo />;
  }

  if (!logo || logoErrors[methodId]) {
    return (
      <div className={CHECKOUT_PAYMENT_LOGO_SLOT_CLASS}>
        <PaymentFallbackIcon />
      </div>
    );
  }

  const imgClassName =
    methodId === 'arca'
      ? CHECKOUT_PAYMENT_LOGO_IMG_CLASS_ARCA
      : methodId === 'aparik'
        ? CHECKOUT_PAYMENT_LOGO_IMG_CLASS_APARIK
        : CHECKOUT_PAYMENT_LOGO_IMG_CLASS;

  return (
    <div className={CHECKOUT_PAYMENT_LOGO_SLOT_CLASS}>
      <img
        src={logo}
        alt={name}
        className={imgClassName}
        loading="lazy"
        onError={() => onLogoError(methodId)}
      />
    </div>
  );
}
