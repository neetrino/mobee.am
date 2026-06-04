import { HeroCarousel } from '../components/HeroCarousel';
import { TopCategories } from '../components/TopCategories';
import { HomePageDeferredSections } from '../components/HomePageDeferredSections';

export default async function HomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <section className="bg-white">
        <HeroCarousel />
      </section>

      <TopCategories />

      <HomePageDeferredSections />
    </div>
  );
}

