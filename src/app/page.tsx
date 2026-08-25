import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { HeroCarousel } from '../components/HeroCarousel';
import { HomeHeroManagedCarousel } from '../components/HomeHeroManagedCarousel';
import { TopCategories } from '../components/TopCategories';
import { HomeProductSectionsSection } from '../components/home/HomeProductSectionsSection';
import { readLanguageFromCookies } from '../lib/language';
import { getCachedHomeCategoryStrip } from '../lib/services/categories-home-strip-cached';
import { getPublicHomeHeroSettings } from '../lib/services/home-hero.service';
import { toHeroCarouselSlides } from '../lib/home-hero';

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
  const [{ result: homeStrip }, homeHero] = await Promise.all([
    getCachedHomeCategoryStrip(language),
    getPublicHomeHeroSettings(),
  ]);

  const managedSlides = toHeroCarouselSlides(homeHero);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      <section className="bg-gray-50">
        {managedSlides.length > 0 ? (
          <HomeHeroManagedCarousel slides={managedSlides} />
        ) : (
          <HeroCarousel />
        )}
      </section>

      <TopCategories initialItems={homeStrip.data} initialLocale={language} />

      <Suspense fallback={<HomeProductSectionsFallback />}>
        <HomeProductSectionsSection language={language} />
      </Suspense>
    </div>
  );
}
