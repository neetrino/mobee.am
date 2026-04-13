'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';

interface EmptyCartProps {
  t: (key: string) => string;
}

export function EmptyCart({ t }: EmptyCartProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('common.cart.title')}</h1>
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <Image
            src="https://cdn-icons-png.flaticon.com/512/3081/3081986.png"
            alt={t('common.cart.empty')}
            width={96}
            height={96}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('common.cart.empty')}
          </h2>
          <Link href="/products">
            <Button variant="primary" size="lg" className="mt-6">
              {t('common.buttons.browseProducts')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}




