'use client';

interface PaymentMethodLogoProps {
  paymentMethod: 'idram' | 'arca' | 'cash_on_delivery';
  logoErrors: Record<string, boolean>;
  onError: () => void;
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: 'w-12 h-8',
  medium: 'w-16 h-10',
  large: 'w-20 h-12',
};

export function PaymentMethodLogo({
  paymentMethod,
  logoErrors,
  onError,
  size = 'medium',
}: PaymentMethodLogoProps) {
  const logoPath = paymentMethod === 'arca' 
    ? '/assets/payments/arca.svg' 
    : '/assets/payments/idram.svg';
  
  const altText = paymentMethod === 'arca' ? 'ArCa' : 'Idram';

  if (logoErrors[paymentMethod]) {
    return (
      <div className={`${sizeClasses[size]} flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden`}>
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden`}>
      <img
        src={logoPath}
        alt={altText}
        className="w-full h-full object-contain p-1"
        loading="lazy"
        onError={onError}
      />
    </div>
  );
}




