'use client';

import Image from 'next/image';
import { useTranslation } from '../../lib/i18n-client';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

/**
 * About Us page — store story and hero content.
 */
export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch gap-12">
            <div className="relative w-full h-[400px] md:h-[500px] lg:min-h-[600px] rounded-lg overflow-hidden shadow-lg">
              <Image
                src="https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                alt={t('about.heroImageAlt')}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <div className="space-y-6">
              <p className="text-sm md:text-base font-semibold uppercase tracking-wider text-[#2DB2FF]">
                {t('about.subtitle')}
              </p>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {t('about.title')}
              </h1>

              <div className="space-y-4 text-gray-600 text-base md:text-lg leading-relaxed">
                <p>
                  {t('about.description.paragraph1')}
                </p>
                <p>
                  {t('about.description.paragraph2')}
                </p>
                <p>
                  {t('about.description.paragraph3')}
                </p>
                <p>
                  {t('about.description.paragraph4')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
