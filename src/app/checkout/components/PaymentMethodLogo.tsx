'use client';

import type { PaymentMethodId } from '../utils/payment-methods';
import {
  CHECKOUT_PAYMENT_LOGO_IMG_CLASS,
  CHECKOUT_PAYMENT_LOGO_IMG_CLASS_ARCA,
} from '../constants';

interface PaymentMethodLogoProps {
  paymentMethod: PaymentMethodId;
  logoErrors: Record<string, boolean>;
  onError: () => void;
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: 'w-12 h-8',
  medium: 'w-16 h-10',
  large: 'w-20 h-12',
} as const;

const PAYMENT_LOGO: Record<PaymentMethodId, { src: string; alt: string }> = {
  cash_on_delivery: {
    src: '/assets/payments/cash-on-delivery.png',
    alt: 'Cash on delivery',
  },
  arca: { src: '/assets/payments/arca.png', alt: 'ArCa' },
  idram: { src: '/assets/payments/idram.png', alt: 'Idram' },
};

export function PaymentMethodLogo({
  paymentMethod,
  logoErrors,
  onError,
  size = 'medium',
}: PaymentMethodLogoProps) {
  const { src: logoPath, alt: altText } = PAYMENT_LOGO[paymentMethod];
  const imgClassName =
    paymentMethod === 'arca' ? CHECKOUT_PAYMENT_LOGO_IMG_CLASS_ARCA : CHECKOUT_PAYMENT_LOGO_IMG_CLASS;

  if (logoErrors[paymentMethod]) {
    return (
      <div
        className={`${sizeClasses[size]} flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden`}
      >
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden`}
    >
      <img
        src={logoPath}
        alt={altText}
        className={imgClassName}
        loading="lazy"
        onError={onError}
      />
    </div>
  );
}
