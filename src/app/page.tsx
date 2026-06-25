import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { HeroCarousel } from '../components/HeroCarousel';
import { TopCategories } from '../components/TopCategories';
import { FeaturedIntroHeading } from '../components/FeaturedIntroHeading';
import { HomeProductSectionsSection } from '../components/home/HomeProductSectionsSection';
import { HomePagePartnerLogos } from '../components/HomePagePartnerLogos';
import { readLanguageFromCookies } from '../lib/language';
import { getCachedHomeCategoryStrip } from '../lib/services/categories-home-strip-cached';

function HomeProductSectionsFallback() {
  return (
    <div
      className="w-full animate-pulse bg-gray-50 pt-2 lg:min-h-[520px] lg:pb-16"
      aria-hidden
    />
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const language = readLanguageFromCookies(cookieStore);
  const { result: homeStrip } = await getCachedHomeCategoryStrip(language);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <section className="bg-white">
        <HeroCarousel />
      </section>

      <TopCategories initialItems={homeStrip.data} initialLocale={language} />

      <FeaturedIntroHeading />

      <Suspense fallback={<HomeProductSectionsFallback />}>
        <HomeProductSectionsSection language={language} />
      </Suspense>

      <HomePagePartnerLogos />
    </div>
  );
}
