import { HeroCarousel } from '../components/HeroCarousel';
import { TopCategories } from '../components/TopCategories';
import { FeaturedIntroHeading } from '../components/FeaturedIntroHeading';
import { HomeProductSections } from '../components/FeaturedProductsTabs';
import { PartnerLogosSection } from '../components/PartnerLogosSection';

export default async function HomePage() {

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Hero Section - Full Width */}
      <section className="bg-white">
        <HeroCarousel />
      </section>

      {/* Top Categories */}
      <TopCategories />

      <FeaturedIntroHeading />

      {/* Stacked curated home product sections */}
      <HomeProductSections />

      <PartnerLogosSection />
    </div>
  );
}

